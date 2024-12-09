import { Injectable, Logger } from '@nestjs/common';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Status } from './interfaces/status.interface';
import { TaskScheduler } from './interfaces/task-scheduler.interface';
import { StatusService } from './status.service';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskRunning } from '../tasks/entities/task_running.entities';
import { Repository } from 'typeorm';

@Injectable()
export class TasksService implements TaskScheduler {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly status: StatusService,
    @InjectRepository(TaskRunning)
    private readonly taskRunningRepo: Repository<TaskRunning>,
  ) {}

  public createJob(
    name: string,
    cronExp: CronExpression | string,
    task: () => void,
  ): Status {
    try {
      const job = new CronJob(cronExp, () => {
        task();
      });

      this.schedulerRegistry.addCronJob(name, job);
      job.start();

      // create database running entry
      this.taskRunningRepo.findOne({ where: { name: name } }).then((resp) => {
        this.taskRunningRepo.save({
          id: resp ? resp.id : null,
          name: name,
          running: false,
          runningSince: null,
        });
      });

      this.logger.log(`Task ${name} created successfully`);
      return this.status.createStatus(
        true,
        `Task ${name} created successfully`,
      );
    } catch (e) {
      this.logger.warn(
        `An error occurred while creating the ${name} task. This is normal on first boot.`,
      );
      this.logger.debug(e);

      return this.status.createStatus(
        false,
        `An error occurred while creating the ${name} task`,
      );
    }
  }

  public updateJob(
    name: string,
    cronExp: CronExpression | string,
    task: () => void,
  ): Status {
    const output = this.removeJob(name);
    if (output.code === 1) {
      return this.createJob(name, cronExp, task);
    }
  }

  public handleJob(name: string): Status {
    try {
      const job = this.schedulerRegistry.getCronJob(name);
      job.start();
      return this.status.createStatus(
        true,
        `Task ${name} started successfully`,
      );
    } catch (e) {
      this.logger.error(`An error occurred while starting the ${name} task.`);
      this.logger.debug(e);
      return this.status.createStatus(
        false,
        `An error occurred while starting the ${name} task`,
      );
    }
  }

  public removeJob(name: string): Status {
    try {
      this.schedulerRegistry.deleteCronJob(name);
      this.logger.log(`Task ${name} removed successfully`);
      return this.status.createStatus(
        true,
        `Task ${name} removed successfully`,
      );
    } catch (e) {
      this.logger.error(`An error occurred while removing the ${name} task.`);
      this.logger.debug(e);
      return this.status.createStatus(
        false,
        `An error occurred while removing the ${name} task`,
      );
    }
  }

  public async setRunning(name: string) {
    const resp = await this.taskRunningRepo.findOne({ where: { name: name } });
    if (resp) {
      await this.taskRunningRepo.update(
        { id: resp.id },
        {
          running: true,
          runningSince: new Date(),
        },
      );
    }
  }

  public async isRunning(name: string) {
    const resp = await this.taskRunningRepo.findOne({ where: { name: name } });
    return resp.running;
  }

  public async clearRunning(name: string) {
    const resp = await this.taskRunningRepo.findOne({ where: { name: name } });
    if (resp) {
      await this.taskRunningRepo.update(
        { id: resp.id },
        {
          running: false,
          runningSince: null,
        },
      );
    }
  }

  public async waitUntilTaskIsFinished(
    name: string,
    myname: string = undefined,
  ) {
    let task = await this.taskRunningRepo.findOne({ where: { name: name } });

    if (task && task.running) {
      this.logger.log(
        `${myname ? `Task ${myname} is waiting` : `Waiting`} for task ${name} to finish...`,
      );
      while (task.running) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        task = await this.taskRunningRepo.findOne({ where: { name: name } });
      }
    }
  }
}
