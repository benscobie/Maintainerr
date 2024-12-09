import { Logger } from '@nestjs/common';
import { ServarrApi } from '../common/servarr-api.service';
import {
  RadarrInfo,
  RadarrMovie,
  RadarrMovieFile,
} from '../interfaces/radarr.interface';

export class RadarrApi extends ServarrApi<{ movieId: number }> {
  constructor({
    url,
    apiKey,
    cacheName,
  }: {
    url: string;
    apiKey: string;
    cacheName?: string;
  }) {
    super({ url, apiKey, cacheName, apiName: 'Radarr' });
    this.logger = new Logger(RadarrApi.name);
  }

  public getMovies = async (): Promise<RadarrMovie[]> => {
    try {
      const response = await this.get<RadarrMovie[]>('/movie');

      return response;
    } catch (e) {
      this.logger.warn(`Failed to retrieve movies`);
      this.logger.debug(`Failed to retrieve movies: ${e.message}`);
    }
  };

  public getMovie = async ({ id }: { id: number }): Promise<RadarrMovie> => {
    try {
      const response = await this.get<RadarrMovie>(`/movie/${id}`);
      return response;
    } catch (e) {
      this.logger.warn(`[Radarr] Failed to retrieve movie with id ${id}`);
      this.logger.debug(`[Radarr] Failed to retrieve movie: ${e.message}`);
    }
  };

  public async getMovieByTmdbId(id: number): Promise<RadarrMovie> {
    try {
      const response = await this.get<RadarrMovie[]>(`/movie?tmdbId=${id}`);

      if (!response[0]) {
        this.logger.warn(`Could not find Movie with TMDb id ${id} in Radarr`);
      }

      return response[0];
    } catch (e) {
      this.logger.warn(`Error retrieving movie by TMDb ID ${id}`);
      this.logger.debug(e);
    }
  }

  public async searchMovie(movieId: number): Promise<void> {
    this.logger.log('Executing movie search command');

    try {
      await this.runCommand('MoviesSearch', { movieIds: [movieId] });
    } catch (e) {
      this.logger.warn(
        'Something went wrong while executing Radarr movie search.',
      );
      this.logger.debug(e);
    }
  }

  public async deleteMovie(
    movieId: number,
    deleteFiles = true,
    importExclusion = false,
  ) {
    try {
      await this.runDelete(
        `movie/${movieId}?deleteFiles=${deleteFiles}&addImportExclusion=${importExclusion}`,
      );
    } catch (e) {
      this.logger.log("Couldn't delete movie. Does it exist in radarr?");
      this.logger.debug(e);
    }
  }

  public async unmonitorMovie(movieId: number, deleteFiles = true) {
    try {
      const movieData: RadarrMovie = await this.get(`movie/${movieId}`);
      movieData.monitored = false;
      await this.runPut(`movie/${movieId}`, JSON.stringify(movieData));

      if (deleteFiles) {
        const movieFiles: RadarrMovieFile[] = await this.get(
          `moviefile?movieId=${movieId}`,
        );
        movieFiles.forEach(
          async (e) => await this.runDelete(`moviefile/${e.id}`),
        );
      }
    } catch (e) {
      this.logger.warn("Couldn't unmonitor movie. Does it exist in radarr?");
      this.logger.debug(e);
    }
  }

  public async info(): Promise<RadarrInfo> {
    try {
      const info: RadarrInfo = (
        await this.axios.get<RadarrInfo>(`system/status`, {
          signal: AbortSignal.timeout(10000), // aborts request after 10 seconds
        })
      ).data;
      return info ? info : null;
    } catch (e) {
      this.logger.warn("Couldn't fetch Radarr info.. Is Radarr up?");
      this.logger.debug(e);
      return null;
    }
  }
}
