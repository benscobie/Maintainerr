import { Logger } from '@nestjs/common';
import { ExternalApiService } from '../external-api/external-api.service';
import cacheManager from './cache';

export interface GraphQLQuery {
  query: string;
  variables: {
    uuid: string;
    first: number;
    after?: string;
    skipUserState?: boolean;
  };
}

export interface PlexCommunityWatchList {
  id: string;
  key: string;
  title: string;
  type: string;
}

export interface PlexCommunityWatchHistory {
  id: string;
  key: string;
  title: string;
  type: string;
}

export class PlexCommunityApi extends ExternalApiService {
  private authToken: string;

  constructor(authToken: string) {
    super(
      'https://community.plex.tv/api',
      {},
      {
        headers: {
          'X-Plex-Token': authToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        nodeCache: cacheManager.getCache('plexcommunity').data,
      },
    );
    this.authToken = authToken;
    this.logger = new Logger(PlexCommunityApi.name);
  }

  public async query(query: GraphQLQuery): Promise<any> {
    try {
      const resp = await this.postRolling('/', JSON.stringify(query));
      return resp;
    } catch (e) {
      this.logger.warn('Failed to execute community.plex.tv GraphQL query');
      this.logger.debug(e);
    }
  }
}

export default PlexCommunityApi;
