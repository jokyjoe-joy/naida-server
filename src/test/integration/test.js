const app = require('../../index');
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

    it("should not be able to register username with already existing username", function(done) {
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
                done();
            }) 
    })
    it('should return the data of the user with the access-token', function (done) {
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

    it("should user have the same account_id as the created account", function(done) {
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
        it("should login as admin", function(done) {
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
    
        it("should sender (admin) have successful transaction", function(done) {
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

describe("Deleting new user", function() {
    it("should delete user", function(done) {
        request(app)
            .delete(`/users/${registeredUserID}`)
            .set('Authorization', 'Bearer ' + accessToken)
            .end(function(err, res) {
                expect(res.statusCode).to.be.equal(200);
                done();
            })
    })
})