const app = require('../../src/index');
const chai = require('chai');
const request = require('supertest');
const expect = chai.expect;

// To prevent console.log() in logging.js.
process.env.NODE_ENV = 'test';

const adminUsername = "admin";
const adminPassword = "HardPass#12";
const registeredUserData = {
    first_name: "Testname",
    last_name: "Testlastname",
    username: "testusername",
    password: "MyAwesome12#",
    email: "testname@testy.com"
}
const receiverUserData = {
    first_name: "Golden",
    last_name: "Receiver",
    username: "goldenrec",
    password: "MyWowTellMe19#",
    email: "goldenrec@goldy.com"
}
let registeredUserID;
let registeredUserAccountID;
let accessToken;
let refreshToken;
let adminAccessToken;

describe('Authentication of new user', function() {
    describe('Registering', function () {
        it("When registering, the user should receive correct user data.", function(done) {
            request(app)
                .post('/register')
                .send(registeredUserData)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.first_name).to.be.equal(registeredUserData.first_name);
                    expect(res.body.last_name).to.be.equal(registeredUserData.last_name);
                    expect(res.body.username).to.be.equal(registeredUserData.username);
                    expect(res.body.password).to.not.be.equal(registeredUserData.password);
                    expect(res.body.email).to.be.equal(registeredUserData.email);
                    expect(res.body.role).to.be.equal('user');
                    registeredUserID = res.body.id;
                    done();
                })
        })
        it("When using a weak password it should throw an error (400).", function(done) {
            request(app)
                .post('/register')
                .send({
                    first_name: "Bad",
                    last_name: "Password",
                    username: "passwordsobad",
                    password: "thisisaweakpass",
                    email: "badpass@bady.com"
                })
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(400);
                    done();
                })
        })
        it("When trying to register with an already existing username it should throw an error.", function(done) {
            request(app)
                .post('/register')
                .send(registeredUserData)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(400);
                    done();
                })  
        })
    })
    describe('Access-token', function () {
        it('When logging in, user should get an access-token and a refresh-token.', function(done) {
            request(app)
                 .post('/login')
                 .send({
                     username: registeredUserData.username,
                     password: registeredUserData.password
                 })
                 .end(function(err, res) {
                     expect(res.statusCode).to.be.equal(200);
                     expect(res.body.accessToken).to.exist;
                     accessToken = res.body.accessToken;
                     expect(res.body.refreshToken).to.exist;
                     refreshToken = res.body.refreshToken;
                     done();
                 }) 
         })
         it('When a user is getting its data, it should get his sensitive data (but not password) with the access-token.', function (done) {
             request(app)
                 .get(`/users/me`)
                 .set('Authorization', 'Bearer ' + accessToken)
                 .end(function(err, res) {
                     expect(res.statusCode).to.be.equal(200);
                     expect(res.body.first_name).to.be.equal(registeredUserData.first_name);
                     expect(res.body.last_name).to.be.equal(registeredUserData.last_name);
                     expect(res.body.username).to.be.equal(registeredUserData.username);
                     expect(res.body.email).to.be.equal(registeredUserData.email);
                     expect(res.body.password).to.not.exist;
                     done();                
                 })
         })
    })
})

describe('Accounts', function () {
    describe('Account creation', function () {
        it("When creating an account, it should have no money on it.", function(done) {
            request(app)
                .post(`/accounts/`)
                .set('Authorization', 'Bearer ' + accessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.id).to.exist;
                    registeredUserAccountID = res.body.id;
                    expect(parseInt(res.body.amount_of_money)).to.be.closeTo(0, 0.001);
                    done();
                })
        })
        it("After creating an account, the user should have the account linked to the user.", function(done) {
            request(app)
                .get(`/users/${registeredUserID}`)
                .set('Authorization', 'Bearer ' + accessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.first_name).to.be.equal(registeredUserData.first_name);
                    expect(res.body.username).to.be.equal(registeredUserData.username);
                    expect(res.body.account_id).to.be.equal(registeredUserAccountID);
                    done();
                })
        })
        it("When creating an account while already having one, a user should receive an error", function(done) {
            request(app)
                .post('/accounts')
                .set('Authorization', 'Bearer ' + accessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(400);
                    done();
                })
        })
    })
})

describe('Administrator privileges', function () {
    describe('Login as an admin', function () {
        it("If an admin user account exists, it should get an access token and a refresh token upon login", function(done) {
            request(app)
                .post('/login')
                .send({
                    username: adminUsername,
                    password: adminPassword
                })
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.accessToken).to.exist;
                    adminAccessToken = res.body.accessToken;
                    expect(res.body.refreshToken).to.exist;
                    done();
                })
        })
        it("An admin user should have a role 'admin'", function(done) {
            request(app)
                .get('/users/me')
                .set('Authorization', 'Bearer ' + adminAccessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.role).to.be.equal('admin');
                    done();
                })
        })
    })
    describe("Getting sensitive information", function() {
        it("An admin should be able to get the data (e.g. email, but not the password) of the owner of an account", function(done) {
            request(app)
                .get(`/accounts/${registeredUserAccountID}/owner`)
                .set('Authorization', 'Bearer ' + adminAccessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.username).to.be.equal(registeredUserData.username);
                    expect(res.body.first_name).to.be.equal(registeredUserData.first_name);
                    expect(res.body.last_name).to.be.equal(registeredUserData.last_name);
                    expect(res.body.password).to.not.exist;
                    expect(res.body.email).to.be.equal(registeredUserData.email);
                    done();
                })
        })
    })
    describe("Creating an account while already having an account", function () {
        it("When creating an account while already having one, an admin should be able to create one", function(done) {
            request(app)
                .post('/accounts')
                .set('Authorization', 'Bearer ' + adminAccessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.id).to.exist;
                    expect(parseInt(res.body.amount_of_money)).to.be.closeTo(0, 0.00001);
                    done();
                })
        })
    })
    describe("Getting all data", function() {
        it("When getting all users, admin should see all users without their passwords", function(done) {
            request(app)
                .get('/users')
                .set('Authorization', 'Bearer ' + adminAccessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body[0].password).to.not.exist;
                    done();
                });
        })
        it("When getting all accounts, admin should see the money on the account", function(done) {
            request(app)
                .get('/accounts')
                .set('Authorization', 'Bearer ' + adminAccessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body[0].amount_of_money).to.exist;
                    done();
                });
        })
        it("When getting all transactions, admin should see the amount of money transferred", function(done) {
            request(app)
                .get('/transactions')
                .set('Authorization', 'Bearer ' + adminAccessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body[0].amount_of_money).to.exist;
                    done();
                });
        })
    })
})

describe('Transactions', function () {        
    describe('Initiating transactions', function () {
        it("When creating a new transaction of 2$, the user should see 2$ as amount_of_money.", function(done) {
            if (!adminAccessToken) this.skip();
            request(app)
                .post('/transactions/')
                .set('Authorization', 'Bearer ' + adminAccessToken)
                .send({
                    receiver_account_id: registeredUserAccountID,
                    amount_of_money: 2.000000,
                    receiver_first_name: registeredUserData.first_name,
                    receiver_last_name: registeredUserData.last_name,
                    message: "Hey, I am sending a few bucks for you!"
                })
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.amount_of_money).to.exist;
                    done();
                })
        })
        it("When the receiver checks his account, it should have 2$.", function(done) {
            if (!adminAccessToken) this.skip();
            request(app)
                .get(`/accounts/${registeredUserAccountID}`)
                .set('Authorization', 'Bearer ' + accessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(parseInt(res.body.amount_of_money)).to.be.closeTo(2, 0.001);
                    done();
                })
        })
    })
});

describe('Logout and token refresh', function () {
    describe("Logging out", function () {
        it("After logging out, the refresh-token should be unusable, thus returning 403.", function(done) {
            request(app)
                .post(`/logout`)
                .send({ token: refreshToken })
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    request(app)
                    .post('/token')
                    .send({ token: refreshToken })
                    .end(function(err, res) {
                        expect(res.statusCode).to.be.equal(403);
                        expect(res.body.accessToken).to.not.exist;
                        done();
                    })
                })
        })
        it('After logging out, user should be able to log in and get an access-token.', function(done) {
            request(app)
                 .post('/login')
                 .send({
                     username: registeredUserData.username,
                     password: registeredUserData.password
                 })
                 .end(function(err, res) {
                     expect(res.statusCode).to.be.equal(200);
                     expect(res.body.accessToken).to.exist;
                     accessToken = res.body.accessToken;
                     expect(res.body.refreshToken).to.exist;
                     refreshToken = res.body.refreshToken;
                     done();
                 }) 
        })
        it('When using refresh token, it should return a usable access-token.', function(done) {
            request(app)
                .post('/token')
                .send({ token: refreshToken })
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.accessToken).to.exist;
                    accessToken = res.body.accessToken;
                    request(app)
                        .get(`/users/${registeredUserID}`)
                        .set('Authorization', 'Bearer ' + accessToken)
                        .end(function(err, res) {
                            expect(res.statusCode).to.be.equal(200);
                            expect(res.body.first_name).to.be.equal(registeredUserData.first_name);
                            expect(res.body.last_name).to.be.equal(registeredUserData.last_name);
                            expect(res.body.username).to.be.equal(registeredUserData.username);
                            done();
                        })
                })
        })
    })
})

describe("Deleting data", function() {
    describe("User and account by user", function() {
        it("A user should be able to delete its own account.", function(done) {
            request(app)
                .delete(`/accounts/${registeredUserAccountID}`)
                .set('Authorization', 'Bearer ' + accessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    done();
                })
        })
        it("A user should be able to delete itself.", function(done) {
            request(app)
                .delete(`/users/${registeredUserID}`)
                .set('Authorization', 'Bearer ' + accessToken)
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    done();
                })
        })
    })
})