import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { CollectionsService } from '../collections/collections.service';
import { Collection } from '../collections/entities/collection.entities';
import { CollectionMedia } from '../collections/entities/collection_media.entities';
import {
  Property,
  RuleConstants,
  RulePossibility,
} from './constants/rules.constants';
import { RuleDto } from './dtos/rule.dto';
import { RulesDto } from './dtos/rules.dto';
import { RuleGroup } from './entities/rule-group.entities';
import { Rules } from './entities/rules.entities';

export interface ReturnStatus {
  code: 0 | 1;
  result?: string;
  message?: string;
}

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);

  ruleConstants: RuleConstants;
  constructor(
    @InjectRepository(Rules)
    private readonly rulesRepository: Repository<Rules>,
    @InjectRepository(RuleGroup)
    private readonly ruleGroupRepository: Repository<RuleGroup>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(CollectionMedia)
    private readonly collectionMediaRepository: Repository<CollectionMedia>,
    private readonly collectionService: CollectionsService,
    private readonly connection: Connection,
  ) {
    this.ruleConstants = new RuleConstants();
  }
  get getRuleConstants(): RuleConstants {
    return this.ruleConstants;
  }
  async getRules(ruleGroupId: string): Promise<Rules[]> {
    return await this.connection
      .getRepository(Rules)
      .createQueryBuilder('rules')
      .where('ruleGroupId = :id', { id: ruleGroupId })
      .getMany();
  }
  async getRuleGroups(activeOnly = false): Promise<RulesDto[]> {
    const rulegroups = await this.connection
      // .getRepository(RuleGroup)
      .createQueryBuilder('rule_group', 'rg')
      // .select(['id', 'name', 'description', 'isActive'])
      .leftJoinAndSelect('rg.rules', 'r')
      .orderBy('r.id')
      .where(activeOnly ? 'rg.isActive = true' : '')
      .getMany();
    return rulegroups as RulesDto[];
  }

  async getRuleGroupById(ruleGroupId: number): Promise<RuleGroup> {
    return await this.ruleGroupRepository.findOne(ruleGroupId);
  }

  async deleteRuleGroup(ruleGroupId: number): Promise<ReturnStatus> {
    try {
      const group = await this.ruleGroupRepository.findOne(ruleGroupId);
      if (group.collectionId) {
        this.collectionMediaRepository.delete({
          collectionId: group.collectionId,
        });
        this.collectionRepository.delete({ id: group.collectionId });
      }

      this.rulesRepository.delete({ ruleGroupId: ruleGroupId });
      this.ruleGroupRepository.delete(ruleGroupId);
      this.logger.log(
        `Removed rulegroup with id ${ruleGroupId} from the database`,
      );
      return this.createReturnStatus(true, 'Success');
    } catch (err) {
      this.logger.error(err);
      return this.createReturnStatus(false, 'Delete Failed');
    }
  }

  async setRules(params: RulesDto) {
    // {
    //   "name": "test",
    //   "description": "dit is een test",
    //   "libraryId" : 1,
    //   "active": true,
    //   "collection": {
    //     "visibleOnHome": true,
    //     "deleteAfterDays" : null,
    //   }
    //   "rules" : [
    //     { "operator": null, "firstVal": [1,0], "lastVal": [3,1],"action": 2},
    //     { "operator": 0, "firstVal": [0,0], "lastVal": [1,0],"action": 1}
    //   ]
    // }

    let state: ReturnStatus = this.createReturnStatus(true, 'Success');
    params.rules.forEach((rule) => {
      if (state.code === 1) {
        state = this.validateRule(rule);
      }
    }, this);

    if (state.code === 1) {
      // create the collection
      const collection = (
        await this.collectionService.createCollection({
          libraryId: params.libraryId,
          title: params.name,
          description: params.description,
          isActive: params.isActive,
          visibleOnHome: params.collection?.visibleOnHome,
          deleteAfterDays: params.collection?.deleteAfterDays,
        })
      ).dbCollection;
      // create group
      const groupId = await this.createNewGroup(
        params.name,
        params.description,
        params.libraryId,
        collection.id,
        params.isActive ? params.isActive : true,
      );
      // create rules
      for (const rule of params.rules) {
        const ruleJson = JSON.stringify(rule);
        await this.rulesRepository.save([
          { ruleJson: ruleJson, ruleGroupId: groupId },
        ]);
      }
      return state;
    } else {
      return state;
    }
  }

  private validateRule(rule: RuleDto): ReturnStatus {
    try {
      const val1: Property = this.ruleConstants.applications
        .find((el) => el.id === rule.firstVal[0])
        .props.find((el) => el.id === rule.firstVal[1]);
      if (rule.lastVal) {
        const val2: Property = this.ruleConstants.applications
          .find((el) => el.id === rule.lastVal[0])
          .props.find((el) => el.id === rule.lastVal[1]);
        if (val1.type === val2.type) {
          if (val1.type.possibilities.includes(rule.action)) {
            return this.createReturnStatus(true, 'Success');
          } else {
            return this.createReturnStatus(
              false,
              'Action is not supported on type',
            );
          }
        } else {
          return this.createReturnStatus(false, "Types don't match");
        }
      } else if (rule.customVal) {
        if (val1.type.toString() === rule.customVal.ruleTypeId.toString()) {
          if (val1.type.possibilities.includes(rule.action)) {
            return this.createReturnStatus(true, 'Success');
          } else {
            return this.createReturnStatus(
              false,
              'Action is not supported on type',
            );
          }
        }
        if (
          (rule.action === RulePossibility.IN_LAST ||
            RulePossibility.IN_NEXT) &&
          rule.customVal.ruleTypeId === 0
        ) {
          return this.createReturnStatus(true, 'Success');
        } else {
          return this.createReturnStatus(false, 'Validation failed');
        }
      } else {
        return this.createReturnStatus(false, 'No second value found');
      }
    } catch {
      return this.createReturnStatus(false, 'Unexpected error occurred');
    }
  }

  private createReturnStatus(succes: boolean, result: string): ReturnStatus {
    return { code: succes ? 1 : 0, result: result };
  }

  private async createNewGroup(
    name: string,
    description: string,
    libraryId: number,
    collectionId: number,
    isActive = true,
  ): Promise<number> {
    const groupId = await this.connection
      .createQueryBuilder()
      .insert()
      .into(RuleGroup)
      .values([
        {
          name: name,
          description: description,
          libraryId: libraryId,
          collectionId: collectionId,
          isActive: isActive,
        },
      ])
      .execute();
    return groupId.identifiers[0].id;
  }
}
