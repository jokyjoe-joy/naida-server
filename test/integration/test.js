const app = require('../../src/index');
const chai = require('chai');
const request = require('supertest');
const expect = chai.expect;

const adminUsername = "admin";
const adminPassword = "HardPass#12";
const weakPassword = "thisisaweakpass";
const registeredUserData = {
    first_name: "Testname",
    last_name: "Testlastname",
    username: "testusername",
    password: "MyAwesome12#"
}
const receiverUserData = {
    first_name: "Golden",
    last_name: "Receiver",
    username: "goldenrec",
    password: "MyWowTellMe19#"
}
let registeredUserID;
let registeredUserAccountID;
let accessToken;
let refreshToken;
let adminAccessToken;

// To prevent console.log() in logging.js.
process.env.NODE_ENV = 'test';

describe('Authentication of new user', function() {
    it("should not accept weak password and return 400", function(done) {
        request(app)
            .post('/register')
            .send({
                first_name: "Bad",
                last_name: "Password",
                username: "passwordsobad",
                password: weakPassword
            })
            .end(function(err, res) {
                expect(res.statusCode).to.be.equal(400);
                done();
            })
    })

    it("should return the data of the created user upon registering", function(done) {
        request(app)
            .post('/register')
            .send(registeredUserData)
            .end(function(err, res) {
                expect(res.statusCode).to.be.equal(200);
                expect(res.body.first_name).to.be.equal(registeredUserData.first_name);
                expect(res.body.last_name).to.be.equal(registeredUserData.last_name);
                expect(res.body.username).to.be.equal(registeredUserData.username);
                expect(res.body.password).to.not.be.equal(registeredUserData.password);
                registeredUserID = res.body.id;
                done();
            })
    })

    it("should not be able to register with an already existing username", function(done) {
        request(app)
            .post('/register')
            .send(registeredUserData)
            .end(function(err, res) {
                expect(res.statusCode).to.be.equal(400);
                done();
            })  
    })

    it('should return an access-token and refresh-token when logging in', function(done) {
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
    it('should return the full data of the user using the access-token', function (done) {
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

describe('Accounts testing', function () {
    it("should return the account data when creating it", function(done) {
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

    it("should created account be linked to the user who created it", function(done) {
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
    
})

if (adminUsername && adminPassword) {
    describe('Transactions testing', function () {        
        it("should be able to login as admin", function(done) {
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

        it("should sender (admin) see a successful transaction", function(done) {
            if (!adminAccessToken) this.skip();
            request(app)
                .post('/transactions/')
                .set('Authorization', 'Bearer ' + adminAccessToken)
                .send({
                    receiver_account_id: registeredUserAccountID,
                    amount_of_money: 2.000000,
                    receiver_first_name: registeredUserData.first_name,
                    receiver_last_name: registeredUserData.last_name
                })
                .end(function(err, res) {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body.amount_of_money).to.exist;
                    done();
                })
        })

        it("should receiver (new user) have more money due to the previous transaction", function(done) {
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
    });
}

describe('Logout and token refresh', function () {
    it("should be able to logout, then have error when using the previous refresh token", function(done) {
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
    it('should be able to log-in and get refresh token', function(done) {
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
    it('should be able to refresh access-token and use it', function(done) {
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

describe("Deleting users and accounts", function() {
    it("should delete test account", function(done) {
        request(app)
            .delete(`/accounts/${registeredUserAccountID}`)
            .set('Authorization', 'Bearer ' + accessToken)
            .end(function(err, res) {
                expect(res.statusCode).to.be.equal(200);
                done();
            })
    })
    it("should delete test user", function(done) {
        request(app)
            .delete(`/users/${registeredUserID}`)
            .set('Authorization', 'Bearer ' + accessToken)
            .end(function(err, res) {
                expect(res.statusCode).to.be.equal(200);
                done();
            })
    })
})