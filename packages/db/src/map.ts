/**
 * status of job running in the queue worker
 */
export const JOB_STATUS = {
    WAITING: 'waiting',
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
} as const;

/**
 * status of job
 */
export const STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
} as const;
