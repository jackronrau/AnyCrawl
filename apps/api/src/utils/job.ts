import { Request } from "express";
import { getDB, schemas, eq, JOB_STATUS, STATUS } from "@anycrawl/db";

export interface CreateJobParams {
    job_id: string;
    job_type: string;
    job_queue_name: string;
    url: string;
    req: Request & { auth?: { uuid?: string } };
    payload?: any;
    status?: string;
    job_status?: string;
    is_success?: boolean;
}

// Job type to expiration duration (ms)
const JOB_TYPE_EXPIRE_MAP: Record<string, number> = {
    crawl: 3 * 60 * 60 * 1000, // 3 hours
    scrape: 1 * 60 * 60 * 1000, // 1 hour
    // add more types as needed
};

function getJobExpireAt(job_type: string): Date {
    const duration = JOB_TYPE_EXPIRE_MAP[job_type] ?? (1 * 60 * 60 * 1000); // default 1 hour
    return new Date(Date.now() + duration);
}

function extractReqMeta(req: Request & { auth?: { uuid?: string } }) {
    return {
        origin: req.ip,
        api_key_id: req.auth?.uuid,
    };
}

/**
 * Create a job in the jobs table
 */
export const createJob = async ({
    job_id,
    job_type,
    job_queue_name,
    url,
    req,
    payload,
    status = STATUS.PENDING,
    job_status = JOB_STATUS.WAITING,
    is_success = false,
}: CreateJobParams): Promise<void> => {
    const db = await getDB();
    const { origin, api_key_id } = extractReqMeta(req);
    const job_expire_at = getJobExpireAt(job_type);

    await db.insert(schemas.jobs).values({
        jobId: job_id,
        jobType: job_type,
        jobQueueName: job_queue_name,
        jobExpireAt: job_expire_at,
        url,
        payload: payload ?? req.body,
        status: status,
        apiKeyId: api_key_id,
        origin: origin,
        jobStatus: job_status,
        isSuccess: is_success,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
};

/**
 * Get a job from the database
 * @param job_id - The ID of the job to get
 * @returns The job
 */
export const getJob = async (job_id: string) => {
    const db = await getDB();
    const job = await db.select().from(schemas.jobs).where(eq(schemas.jobs.jobId, job_id)).limit(1);
    return job[0];
};

/**
 * Cancel a job
 * @param job_id - The ID of the job to cancel
 * @returns The cancelled job
 */
export const cancelJob = async (job_id: string) => {
    const db = await getDB();
    const job = await getJob(job_id);
    if (job.length > 0) {
        await db.update(schemas.jobs).set({ status: STATUS.CANCELLED, jobStatus: JOB_STATUS.CANCELLED }).where(eq(schemas.jobs.jobId, job_id));
        return job[0];
    }
    return null;
};