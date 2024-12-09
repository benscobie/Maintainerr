import { Injectable, Logger } from '@nestjs/common';
import { PlexLibraryItem } from '../../../modules/api/plex-api/interfaces/library.interfaces';
import { ServarrService } from '../../../modules/api/servarr-api/servarr.service';
import {
  Application,
  Property,
  RuleConstants,
} from '../constants/rules.constants';
import { EPlexDataType } from '../../api/plex-api/enums/plex-data-type-enum';
import { PlexApiService } from '../../api/plex-api/plex-api.service';
import _ from 'lodash';
import { TmdbApiService } from '../../../modules/api/tmdb-api/tmdb.service';
import { TmdbIdService } from '../../../modules/api/tmdb-api/tmdb-id.service';
import { PlexMetadata } from '../../../modules/api/plex-api/interfaces/media.interface';
import { SonarrSeason } from '../../../modules/api/servarr-api/interfaces/sonarr.interface';
import { RulesDto } from '../dtos/rules.dto';
import { SonarrApi } from '../../api/servarr-api/helpers/sonarr.helper';

@Injectable()
export class SonarrGetterService {
  plexProperties: Property[];
  private readonly logger = new Logger(SonarrGetterService.name);

  constructor(
    private readonly servarrService: ServarrService,
    private readonly plexApi: PlexApiService,
    private readonly tmdbApi: TmdbApiService,
    private readonly tmdbIdHelper: TmdbIdService,
  ) {
    const ruleConstanst = new RuleConstants();
    this.plexProperties = ruleConstanst.applications.find(
      (el) => el.id === Application.SONARR,
    ).props;
  }
  async get(
    id: number,
    libItem: PlexLibraryItem,
    dataType?: EPlexDataType,
    ruleGroup?: RulesDto,
  ) {
    if (!ruleGroup.collection?.sonarrSettingsId) {
      this.logger.error(
        `No Sonarr server configured for ${ruleGroup.collection?.title}`,
      );
      return null;
    }

    try {
      const prop = this.plexProperties.find((el) => el.id === id);
      let origLibItem = undefined;
      let season = undefined;
      let episode = undefined;
      if (
        dataType === EPlexDataType.SEASONS ||
        dataType === EPlexDataType.EPISODES
      ) {
        origLibItem = _.cloneDeep(libItem);
        season = libItem.grandparentRatingKey
          ? libItem.parentIndex
          : libItem.index;

        // get (grand)parent
        libItem = (await this.plexApi.getMetadata(
          libItem.grandparentRatingKey
            ? libItem.grandparentRatingKey
            : libItem.parentRatingKey,
        )) as unknown as PlexLibraryItem;
      }

      const tvdbId = await this.findTvdbidFromPlexLibItem(libItem);

      if (!tvdbId) {
        this.logger.warn(
          `[TVDB] Failed to fetch tvdb id for '${libItem.title}'`,
        );
        return null;
      }

      if (tvdbId) {
        const sonarrApiClient = await this.servarrService.getSonarrApiClient(
          ruleGroup.collection.sonarrSettingsId,
        );

        const showResponse = await sonarrApiClient.getSeriesByTvdbId(tvdbId);

        season = season
          ? showResponse.seasons.find((el) => el.seasonNumber === season)
          : season;

        // fetch episode or first episode of the season
        episode =
          [EPlexDataType.SEASONS, EPlexDataType.EPISODES].includes(dataType) &&
          showResponse.added !== '0001-01-01T00:00:00Z'
            ? (showResponse.id
                ? await sonarrApiClient.getEpisodes(
                    showResponse.id,
                    origLibItem.grandparentRatingKey
                      ? origLibItem.parentIndex
                      : origLibItem.index,
                    [origLibItem.grandparentRatingKey ? origLibItem.index : 1],
                  )
                : [])[0]
            : undefined;

        const episodeFile =
          episode && dataType === EPlexDataType.EPISODES
            ? await sonarrApiClient.getEpisodeFile(episode.episodeFileId)
            : undefined;

        if (tvdbId && showResponse?.id) {
          switch (prop.name) {
            case 'addDate': {
              return showResponse.added &&
                showResponse.added !== '0001-01-01T00:00:00Z'
                ? new Date(showResponse.added)
                : null;
            }
            case 'diskSizeEntireShow': {
              if (
                [EPlexDataType.SEASONS, EPlexDataType.EPISODES].includes(
                  dataType,
                )
              ) {
                if (dataType === EPlexDataType.EPISODES) {
                  return episodeFile?.size ? +episodeFile.size / 1048576 : null;
                } else {
                  return season?.statistics?.sizeOnDisk
                    ? +season.statistics.sizeOnDisk / 1048576
                    : null;
                }
              } else {
                return showResponse.statistics.sizeOnDisk
                  ? +showResponse.statistics.sizeOnDisk / 1048576
                  : null;
              }
            }
            case 'filePath': {
              return showResponse?.path ? showResponse.path : null;
            }
            case 'tags': {
              const tagIds = showResponse.tags;
              return (await sonarrApiClient.getTags())
                .filter((el) => tagIds.includes(el.id))
                .map((el) => el.label);
            }
            case 'qualityProfileId': {
              if ([EPlexDataType.EPISODES].includes(dataType) && episodeFile) {
                return episodeFile.quality.quality.id;
              } else {
                return showResponse.qualityProfileId;
              }
            }
            case 'firstAirDate': {
              if (
                [EPlexDataType.SEASONS, EPlexDataType.EPISODES].includes(
                  dataType,
                )
              ) {
                return episode?.airDate ? new Date(episode.airDate) : null;
              } else {
                return showResponse.firstAired
                  ? new Date(showResponse.firstAired)
                  : null;
              }
            }
            case 'seasons': {
              if (
                [EPlexDataType.SEASONS, EPlexDataType.EPISODES].includes(
                  dataType,
                )
              ) {
                return season?.statistics?.totalEpisodeCount
                  ? +season.statistics.totalEpisodeCount
                  : null;
              } else {
                return showResponse.statistics.seasonCount
                  ? +showResponse.statistics.seasonCount
                  : null;
              }
            }
            case 'status': {
              return showResponse.status ? showResponse.status : null;
            }
            case 'ended': {
              return showResponse.ended !== undefined
                ? showResponse.ended
                  ? 1
                  : 0
                : null;
            }
            case 'monitored': {
              if (dataType === EPlexDataType.SEASONS) {
                return showResponse.added !== '0001-01-01T00:00:00Z' && season
                  ? season.monitored
                    ? 1
                    : 0
                  : null;
              }

              if (dataType === EPlexDataType.EPISODES) {
                return showResponse.added !== '0001-01-01T00:00:00Z' && episode
                  ? episode.monitored
                    ? 1
                    : 0
                  : null;
              }

              return showResponse.added !== '0001-01-01T00:00:00Z'
                ? showResponse.monitored
                  ? 1
                  : 0
                : null;
            }
            case 'unaired_episodes': {
              // returns true if a season with unaired episodes is found in monitored seasons
              const data = [];
              if (dataType === EPlexDataType.SEASONS) {
                data.push(season);
              } else {
                data.push(...showResponse.seasons.filter((el) => el.monitored));
              }
              return (
                data.filter((el) => el.statistics?.nextAiring !== undefined)
                  .length > 0
              );
            }
            case 'unaired_episodes_season': {
              // returns true if the season of an episode has unaired episodes
              return season?.statistics
                ? season.statistics.nextAiring !== undefined
                : false;
            }
            case 'seasons_monitored': {
              // returns the number of monitored seasons / episodes
              if (
                [EPlexDataType.SEASONS, EPlexDataType.EPISODES].includes(
                  dataType,
                )
              ) {
                return season?.statistics?.episodeCount
                  ? +season.statistics.episodeCount
                  : null;
              } else {
                return showResponse.seasons.filter((el) => el.monitored).length;
              }
            }
            case 'part_of_latest_season': {
              // returns the true when this is the latest season or the episode is part of the latest season
              if (
                [EPlexDataType.SEASONS, EPlexDataType.EPISODES].includes(
                  dataType,
                )
              ) {
                return season.seasonNumber && showResponse.seasons
                  ? +season.seasonNumber ===
                      (
                        await this.getLastSeason(
                          showResponse.seasons,
                          showResponse.id,
                          sonarrApiClient,
                        )
                      )?.seasonNumber
                  : false;
              }
            }
          }
        } else return null;
      } else {
        this.logger.debug(
          `Couldn't fetch Sonarr metadate for media '${libItem.title}' with id '${libItem.ratingKey}'. As a result, no Sonarr query could be made.`,
        );
        return null;
      }
    } catch (e) {
      this.logger.warn(`Sonarr-Getter - Action failed : ${e.message}`);
      return undefined;
    }
  }

  /**
   * Retrieves the last season from the given array of seasons.
   *
   * @param {SonarrSeason[]} seasons - The array of seasons to search through.
   * @param {number} showId - The ID of the show.
   * @return {Promise<SonarrSeason>} The last season found, or undefined if none is found.
   */
  private async getLastSeason(
    seasons: SonarrSeason[],
    showId: number,
    apiClient: SonarrApi,
  ): Promise<SonarrSeason> {
    // array find doesn't work as expected.. so keep this a for loop
    for (const s of seasons.reverse()) {
      const epResp = showId
        ? await apiClient.getEpisodes(showId, s.seasonNumber, [1])
        : [];

      const resp =
        epResp[0] && epResp[0].airDate === undefined
          ? false
          : s.statistics?.nextAiring !== undefined
            ? s.statistics.previousAiring !== undefined
            : true;

      if (resp) return s;
    }
    return undefined;
  }

  public async findTvdbidFromPlexLibItem(libItem: PlexLibraryItem) {
    let tvdbid = this.getGuidFromPlexLibItem(libItem, 'tvdb');
    if (!tvdbid) {
      const plexMetaData = await this.plexApi.getMetadata(libItem.ratingKey);
      tvdbid = this.getGuidFromPlexLibItem(plexMetaData, 'tvdb');
      if (!tvdbid) {
        const resp = await this.tmdbIdHelper.getTmdbIdFromPlexData(libItem);
        const tmdb = resp?.id ? resp.id : undefined;
        if (tmdb) {
          const tmdbShow = await this.tmdbApi.getTvShow({ tvId: tmdb });
          if (tmdbShow?.external_ids?.tvdb_id) {
            tvdbid = tmdbShow.external_ids.tvdb_id;
          }
        }
      }
    }

    if (!tvdbid) {
      console.warn(
        `Couldn't find tvdb id for '${libItem.title}', can not run Sonarr rules against this item`,
      );
    }
    return tvdbid;
  }

  private getGuidFromPlexLibItem(
    libItem: PlexLibraryItem | PlexMetadata,
    guiID: 'tvdb' | 'imdb' | 'tmdb',
  ) {
    return libItem.Guid
      ? +libItem.Guid.find((el) => el.id.includes(guiID))?.id?.split('://')[1]
      : libItem.guid.includes(guiID)
        ? +libItem.guid.split('://')[1].split('?')[0]
        : undefined;
  }
}
