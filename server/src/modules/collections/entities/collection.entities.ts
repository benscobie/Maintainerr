import { RulesDto } from '../../rules/dtos/rules.dto';
import { RuleGroup } from '../../rules/entities/rule-group.entities';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { CollectionMedia } from './collection_media.entities';
import { EPlexDataType } from '../../api/plex-api/enums/plex-data-type-enum';
import { CollectionLog } from '../../collections/entities/collection_log.entities';
import { RadarrSettings } from '../../settings/entities/radarr_settings.entities';
import { SonarrSettings } from '../../settings/entities/sonarr_settings.entities';

@Entity()
export class Collection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  plexId: number;

  @Column()
  libraryId: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  arrAction: number;

  @Column({ default: false })
  visibleOnHome: boolean;

  @Column({ nullable: true, default: null })
  deleteAfterDays: number;

  @Column({ nullable: false, default: false })
  manualCollection: boolean;

  @Column({ nullable: true, default: '' })
  manualCollectionName: string;

  @Column({ nullable: false, default: false })
  listExclusions: boolean;

  @Column({ nullable: false, default: false })
  forceOverseerr: boolean;

  @Column({ nullable: false, default: 1 })
  type: EPlexDataType;

  @Column({ nullable: false, default: 6 })
  keepLogsForMonths: number;

  @OneToOne(() => RuleGroup, (rg) => rg.collection)
  ruleGroup: RulesDto;

  @Column({ type: 'date', nullable: true, default: () => 'CURRENT_TIMESTAMP' }) // nullable = true for old collections
  addDate: Date;

  @Column({ nullable: false, default: 0 })
  handledMediaAmount: number;

  @Column({ nullable: false, default: 0 })
  lastDurationInSeconds: number;

  @Column({ nullable: true, default: null })
  tautulliWatchedPercentOverride: number;

  @Column({ nullable: true })
  radarrSettingsId: number;

  @ManyToOne(() => RadarrSettings, { nullable: true })
  @JoinColumn({ name: 'radarrSettingsId', referencedColumnName: 'id' })
  radarrSettings: RadarrSettings;

  @Column({ nullable: true })
  sonarrSettingsId: number;

  @ManyToOne(() => SonarrSettings, { nullable: true })
  @JoinColumn({ name: 'sonarrSettingsId', referencedColumnName: 'id' })
  sonarrSettings: SonarrSettings;

  @OneToMany(
    () => CollectionMedia,
    (collectionMedia) => collectionMedia.collectionId,
    { onDelete: 'CASCADE' },
  )
  collectionMedia: CollectionMedia[];

  @OneToMany(() => CollectionLog, (collectionLog) => collectionLog.collection, {
    onDelete: 'CASCADE',
  })
  collectionLog: CollectionLog[];
}
