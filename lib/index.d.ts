/// <reference types="bluebird" />
import * as Knex from 'knex';
import * as Promise from 'bluebird';
export declare const AuthenticationErrors: {
    EMAIL_IN_USE: string;
    NOT_FOUND: string;
    NOT_VERIFIED: string;
    WRONG_PASSWORD: string;
    EXPIRED_RESET_KEY: string;
};
export interface UserAccount {
    id: string;
    email: string;
    hashpass: string;
    reset_key: string;
    failed_attempts: number;
    verified_email_at: number;
    changed_email_at: number;
    reset_expire_at: number;
    created_at: number;
    updated_at: number;
}
export declare class AuthenticationService {
    private db;
    constructor(db: Knex);
    initialize(): Promise<void>;
    signup(email: string, password: string): Promise<string>;
    verifyEmail(email: string): any;
    signin(email: string, password: string, options?: {
        mustHaveEmailVerified: boolean;
    }): Promise<UserAccount>;
    changeEmail(id: string, password: string, newEmail: string): any;
    changePassword(id: string, password: string, newPassword: string): any;
    generateResetKey(email: string, expireAt: number): Promise<string>;
    resetPassword(email: string, resetKey: string, newPassword: string): any;
    private createAccount(email, password);
    private updateAccount(id, fields);
    private findOne(fields);
    private ensureSamePassword(account, password);
    private ensureVerifiedEmail(account);
    private ensureEmailNotInUse(email);
}
