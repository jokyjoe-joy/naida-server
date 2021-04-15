var app = require('../../index');
var chai = require('chai');
var request = require('supertest');

var expect = chai.expect;

describe('Authentication of new user', function() {
    const weakPassword = "thisisaweakpass";
    const registeredUserData = {
        first_name: "Testname",
        last_name: "Testlastname",
        username: "testusernamethatisdeletedafterwards",
        password: "MyAwesome12#"
    }
    let registeredUserID;
    let accessToken;

    after(function(done){
        request(app)
            .delete(`/users/${registeredUserID}`)
            .set('Authorization', 'Bearer ' + accessToken)
            .end(function(err, res) {
                expect(res.statusCode).to.be.equal(200);
                done();
            })
    })

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