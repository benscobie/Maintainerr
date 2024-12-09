import { ICollection } from '../../collections/interfaces/collection.interface';
import { RuleDto } from './rule.dto';
import { RuleDbDto } from './ruleDb.dto';
import { EPlexDataType } from '../../api/plex-api/enums/plex-data-type-enum';

export class RulesDto {
  id?: number;
  libraryId: number;
  name: string;
  description: string;
  isActive?: boolean;
  arrAction?: number;
  useRules?: boolean;
  collection?: ICollection;
  listExclusions?: boolean;
  forceOverseerr?: boolean;
  rules: RuleDto[] | RuleDbDto[];
  manualCollection?: boolean;
  manualCollectionName?: string;
  dataType: EPlexDataType;
  tautulliWatchedPercentOverride?: number;
  radarrSettingsId?: number;
  sonarrSettingsId?: number;
}
