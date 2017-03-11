import * as Knex from 'knex';
import * as bcrypt from 'bcrypt';
import { Account, AccountService, Errors } from '..';

const db = Knex({
    "debug": false,
    "useNullAsDefault": true,
    "dialect": "sqlite3",
    "connection": {
        "filename": ":memory:"
    }
});

const service = new AccountService(db);

const now = new Date().getTime();

const accounts: Account[] = [{
    id: 'account-0',
    email: 'account-0@example.com',
    hashpass: bcrypt.hashSync('pass-0', 10),
    verified_email_at: 0,
    changed_email_at: now,
    reset_expire_at: 0,
    created_at: now,
    updated_at: now,
}, {
    id: 'account-1',
    email: 'account-1@example.com',
    hashpass: bcrypt.hashSync('pass-1', 10),
    verified_email_at: now,
    changed_email_at: now,
    reset_expire_at: 0,
    created_at: now,
    updated_at: now,
}];

describe('AccountService', () => {
    beforeAll(() => {
        return service.initialize();
    });

    afterAll(db.destroy);

    beforeEach(() => {
        return db('account')
            .delete()
            .then(() => db('account').insert(accounts))
    });

    expect(service).toBeDefined();

    describe('.signup', () => {
        describe('when the email is not in use', () => {
            it('should create a new account', () => {
                const email = 'account-3@example.com';
                const password = '123';
                return service.signup(email, password).then((id: string) => {
                    expect(id).toBeDefined();
                    return db('account')
                        .select('*')
                        .where('id', id)
                        .then((_accounts: Account[]) => {
                            expect(_accounts.length).toBe(1);
                            expect(_accounts[0].email).toBe(email);
                            expect(bcrypt.compareSync(password, _accounts[0].hashpass)).toBe(true);
                        });
                });
            });
        });

        describe('when the email is already in use', () => {
            it('should not a new account', () => {
                const email = 'account-0@example.com';
                const password = '123';
                return service.signup(email, password).catch((err) => {
                    expect(err).toBe(Errors.EMAIL_IN_USE);
                });
            });
        });
    });

    describe('.verifyEmail', () => {
        describe('with an unverified email', () => {
            it('should verify the email', () => {
                return service.verifyEmail(accounts[0].email).then(() => {
                    return db('account')
                        .select('*')
                        .where('id', accounts[0].id)
                        .then((_accounts: Account[]) => {
                            expect(_accounts.length).toBe(1);
                            expect(_accounts[0].id).toBe(accounts[0].id);
                            expect(_accounts[0].email).toBe(accounts[0].email);
                            expect(_accounts[0].verified_email_at).toBeGreaterThan(0);
                            expect(_accounts[0].verified_email_at / (60 * 1000)).toBeCloseTo(new Date().getTime() / (60 * 1000));
                        });
                });
            });
        });
    });

    describe('.signin', () => {
        describe('with the wrong email', () => {
            it('should fail', () => {
                service.signin('wrong-email@example.com', 'pass-0')
                    .catch((err: string) => {
                        expect(err).toBe(Errors.NOT_FOUND);
                    });
            });
        });

        describe('with the wrong password', () => {
            it('should fail', () => {
                service.signin(accounts[0].email, 'wrong-password')
                    .catch((err: string) => {
                        expect(err).toBe(Errors.WRONG_PASSWORD);
                    });
            });
        });

        describe('with the wrong email and password', () => {
            it('should fail', () => {
                service.signin('wrong-email@example.com', 'wrong-password').catch((err: string) => {
                    expect(err).toBe(Errors.NOT_FOUND);
                });
            });
        });

        describe('with the right email/password of an unverified account, requiring a verified account', () => {
            it('should fail', () => {
                service.signin(accounts[0].email, 'pass-0', { mustHaveEmailVerified: true })
                    .catch((err: string) => {
                        expect(err).toBe(Errors.NOT_VERIFIED);
                    });
            });
        });

        describe('with the right email/password of a verified account, requiring a verified account', () => {
            it('should signin', () => {
                service.signin(accounts[1].email, 'pass-1', { mustHaveEmailVerified: true })
                    .then((_account: Account) => {
                        expect(_account.id).toBe(accounts[1].id);
                        expect(_account.email).toBe(accounts[1].email);
                    });
            });
        });

        describe('with the right email/password of an unverified account, not requiring a verified account', () => {
            it('should signin', () => {
                service.signin(accounts[0].email, 'pass-0')
                    .then((_account: Account) => {
                        expect(_account.id).toBe(accounts[0].id);
                        expect(_account.email).toBe(accounts[0].email);
                    });
            });
        });
    });

    describe('.changeEmail', () => {
        describe('with the wrong id', () => {
            it('should fail', () => {
                return service.changeEmail('wrong-id', 'pass-0', 'account-00@example.com')
                    .catch((err: string) => {
                        expect(err).toBe(Errors.NOT_FOUND);
                    });
            });
        });

        describe('with the wrong password', () => {
            it('should fail', () => {
                return service.changeEmail(accounts[0].id, 'wrong-pass', 'account-00@example.com')
                    .catch((err: string) => {
                        expect(err).toBe(Errors.WRONG_PASSWORD);
                    });
            });
        });

        describe('with the right id/password, to an email already in use', () => {
            it('should fail', () => {
                return service.changeEmail(accounts[0].id, 'pass-0', 'account-1@example.com')
                    .catch((err: string) => {
                        expect(err).toBe(Errors.EMAIL_IN_USE);
                    });
            });
        });

        describe('with the right id/password, to an email not in use', () => {
            it('should change the email', () => {
                return service.changeEmail(accounts[0].id, 'pass-0', 'account-00@example.com')
                    .then(() => {
                        return db('account').where('id', accounts[0].id)
                            .then((_accounts: Account[]) => {
                                expect(_accounts.length).toBe(1);
                                expect(_accounts[0].email).toBe('account-00@example.com');
                                expect(_accounts[0].changed_email_at / (60 * 1000)).toBeCloseTo(new Date().getTime() / (60 * 1000));
                                expect(_accounts[0].changed_email_at).toBeGreaterThan(_accounts[0].verified_email_at);
                            });
                    });
            });
        });
    });

    describe('.changePassword', () => {
        describe('with the wrong id', () => {
            it('should fail', () => {
                return service.changePassword('wrong-id', 'pass-0', 'pass-00')
                    .catch((err: string) => {
                        expect(err).toBe(Errors.NOT_FOUND);
                    });
            });
        });

        describe('with the wrong password', () => {
            it('should fail', () => {
                return service.changeEmail(accounts[0].id, 'wrong-pass', 'pass-00')
                    .catch((err: string) => {
                        expect(err).toBe(Errors.WRONG_PASSWORD);
                    });
            });
        });

        describe('with the right id/password', () => {
            it('should change the password', () => {
                return service.changePassword(accounts[0].id, 'pass-0', 'pass-00')
                    .then(() => {
                        return db('account').where('id', accounts[0].id)
                            .then((_accounts: Account[]) => {
                                expect(_accounts.length).toBe(1);
                                expect(bcrypt.compareSync('pass-00', _accounts[0].hashpass)).toBe(true);
                            });
                    });
            });
        });
    });

    describe('.generateResetKey', () => {
        const now = new Date().getTime();
        const future = now + (60 * 1000);
        const past = now - (60 * 1000);

        describe('with the wrong email', () => {
            it('should fail', () => {
                return service.generateResetKey('wrong-email', future)
                    .catch((err: string) => {
                        expect(err).toBe(Errors.NOT_FOUND);
                    });
            });
        });

        describe('with the right email', () => {
            it('should fail', () => {
                return service.generateResetKey(accounts[0].email, future)
                    .then((resetKey: string) => {
                        return db('account').where('id', accounts[0].id)
                            .then((_accounts: Account[]) => {
                                expect(_accounts.length).toBe(1);
                                expect(_accounts[0].reset_key).toBe(resetKey);
                                expect(_accounts[0].reset_expire_at).toBe(future);
                            });
                    });
            });
        });
    });
});
