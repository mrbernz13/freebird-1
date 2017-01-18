var fs = require('fs'),
    path = require('path');

var _ = require('busyman'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect;

chai.use(sinonChai);

var Freebird = require('../index');

var fakeNc = {
        _freebird: {},
        _controller: {},
        getName: function () { return 'fakeNc1'; },
        start: function () {}, 
        stop: function () {},  
        reset: function () {},  
        permitJoin: function () {}, 
        remove: function () {},  
        ban: function () {}, 
        unban: function () {}, 
        ping: function () {}, 
        maintain: function () {}
    },
    fakeNc2 = {
        _freebird: {},
        _controller: {},
        getName: function () { return 'fakeNc2'; },
        start: function () {}, 
        stop: function () {},  
        reset: function () {},  
        permitJoin: function () {}, 
        remove: function () {},  
        ban: function () {}, 
        unban: function () {}, 
        ping: function () {}, 
        maintain: function () {}
    },
    fb = new Freebird([fakeNc], { dbPaths: {
        device: path.resolve(__dirname, '../database/testDevices1.db'), 
        gadget: path.resolve(__dirname, '../database/testGadgets1.db')
    }}),
    fbMultiNc = new Freebird([fakeNc, fakeNc2], { dbPaths: {
        device: path.resolve(__dirname, '../database/testDevices2.db'), 
        gadget: path.resolve(__dirname, '../database/testGadgets2.db')
    }}),
    fakeGetFunc = function (name) {
        switch (name) {
            case 'netcore':
                return fakeNc;

            case 'permAddr':
                return '00:00:00:00:00';

            case 'auxId':
                return 'aa/bb';

            case 'id':
                return this._id;

            case 'device':
                return fakeDev;

            case 'gadTable':
                return this._gads;

        }
    },
    fakeSetFunc = function (name, value) {
        switch (name) {
            case '_id':
                this._id = value;
                break;
        }
    },
    fakeDev = {
        _netcore: {},
        _id: 1,
        _recovering: false,
        _poke: function () {},
        _gads: [],
        get: fakeGetFunc,
        set: fakeSetFunc,
        ping: function () {},
        dump: function () {
            return {
                netcore: 'fakeNc1',
                id: this._id,
                gads: this._gads,
                net: { address: { permanent: '00:00:00:00:00' }}
            };
        }
    },
    fakeGad = {
        _id: 1,
        _auxId: 'aa/bb',
        _dev: fakeDev,
        _recovering: false,
        _clear: function () {},
        disable: function () {},
        get: fakeGetFunc,
        set: fakeSetFunc,
        dump: function () {
            return {
                netcore: 'fakeNc1',
                id: this._id,
                auxId: this._auxId,
                dev: {
                    id: fakeDev._id,
                    permAddr: '00:00:00:00:00'
                }
            };
        }
    };

describe('freebird - Functional Check', function () {
    describe('#findById(type, id)', function () {
        it('should find netcore by id', function (done) {
            if (fb.findById('netcore', 'fakeNc1') === fakeNc)
                done();
        });

        it('should find device by id', function (done) {
            var getStub = sinon.stub(fb._devbox, 'get', function (id) {
                    if (id === 'xxx') {
                        getStub.restore();
                        done();
                    }
                });

            fb.findById('device', 'xxx');
        });        

        it('should find gadget by id', function (done) {
            var getStub = sinon.stub(fb._gadbox, 'get', function (id) {
                    if (id === 'xxx') {
                        getStub.restore();
                        done();
                    }
                });

            fb.findById('gadget', 'xxx');
        });
    });

    describe('#findByNet(type, ncName, permAddr, auxId)', function () {
        it('should find netcore by ncName', function (done) {
            if (fb.findByNet('netcore', 'fakeNc1') === fakeNc)
                done();
        });

        it('should find device by permAddr', function (done) {
            var findStub = sinon.stub(fb._devbox, 'find', function (callback) {
                    if (callback(fakeDev))
                        return fakeDev;
                });

            if (fb.findByNet('device', 'fakeNc1', '00:00:00:00:00') === fakeDev) {
                findStub.restore();
                done();
            }
        });        

        it('should find gadget by auxId', function (done) {
            var findStub = sinon.stub(fb._gadbox, 'find', function (callback) {                  
                    if (callback(fakeGad))
                        return fakeGad;
                });

            if (fb.findByNet('gadget', 'fakeNc1', '00:00:00:00:00', 'aa/bb') === fakeGad) {
                findStub.restore();
                done();
            }
        });
    });

    describe('#filter(type, pred)', function () {
        it('should filter netcore by pred', function (done) {
            if (fb.filter('netcore', function (nc) { return nc.getName() === 'fakeNc1'; })[0] === fakeNc)
                done();
        });

        it('should filter device by pred', function (done) {
            var predFunc = function () {},
                filterStub = sinon.stub(fb._devbox, 'filter', function (callback) {
                    if (callback === predFunc)
                        filterStub.restore();
                        done();
                });

            fb.filter('device', predFunc);
        });        

        it('should filter gadget by pred', function (done) {
            var predFunc = function () {},
                filterStub = sinon.stub(fb._gadbox, 'filter', function (callback) {                  
                    if (callback === predFunc)
                        filterStub.restore();
                        done();
                });

            fb.filter('gadget', predFunc);
        });
    });

    describe('#register(type, obj, callback)', function () {
        it('should register device with recovering false', function (done) {
            fakeDev._poke = sinon.spy();
            fakeDev._recovering = false;
            fb.register('device', fakeDev, function (err, id) {
                if (id === fakeDev._id) {
                    expect(fakeDev._poke).to.have.been.calledOnce;
                    expect(fb.findById('device', 1)).to.be.equal(fakeDev);
                    fb.unregister('device', fakeDev, function (err, id) { 
                        done();
                    });
                }
            });
        });

        it('should register device with recovering true', function (done) {
            fakeDev._recovering = true;
            fb.register('device', fakeDev, function (err, id) {
                if (id === fakeDev._id && fakeDev._recovering === false) {
                    done();
                }
            });
        });

        it('should register gadget with recovering false', function (done) {
            fakeGad._recovering = false;
            fb.register('gadget', fakeGad, function (err, id) {
                if (id === fakeGad._id && fakeDev._gads.length !== 0) {
                    fb.unregister('gadget', fakeGad, function (err, id) { 
                        done();
                    });
                }
            });
        });

        it('should register gadget with recovering true', function (done) {
            fakeGad._recovering = true;
            fb.register('gadget', fakeGad, function (err, id) {
                if (id === fakeGad._id && fakeDev._recovering === false) {
                    done();
                }
            });
        });
    });

    describe('#unregister(type, obj, callback)', function () {
        it('should register device', function (done) {
            fb.unregister('device', fakeDev, function (err, id) {
                if (!fb.findById('device', 1))
                    done();
            });
        });

        it('should register gadget', function (done) {
            fb.unregister('gadget', fakeGad, function (err, id) {
                if (!fb.findById('gadget', 1))
                    done();
            });
        });
    });

    describe('#start(callback)', function () {
        it('should start netcore and not thing reload', function (done) {
            var startStub = sinon.stub(fakeNc, 'start', function (callback) {    
                    if (_.isFunction(callback)) {                              
                        startStub.restore();
                        expect(fb.findById('device', 1)).to.be.equal(undefined);
                        callback();
                    }
                });

            fb.start(function (err) {
                done();
            });
        });

        it('should start netcore and some thing reload', function (done) {
            var devFindFromDbStub = sinon.stub(fb._devbox, 'findFromDb', function (obj, callback) {  
                    callback(null, [{"netcore":"fakeNc1","id":10,"gads":[{"gadId":10,"auxId":"aa/cc"}],"net":{"address":{"permanent":"00:00:00:00:01"}}, "attrs": {}, "props": {}, "_id":"eD3Tg3iGOZJQgfjZ"}]);
                }),
                gadFindFromDbStub = sinon.stub(fb._gadbox, 'findFromDb', function (obj, callback) {  
                    callback(null, [{"netcore":"fakeNc1","id":10,"auxId":"aa/cc","dev":{"id":10,"permAddr":"00:00:00:00:01"}, "attrs": {}, "props": {}, "panel": {},"_id":"tUmqSZCXgvC5Fc6u"}]);
                }),
                startStub = sinon.stub(fakeNc, 'start', function (callback) {    
                    if (_.isFunction(callback) && fb.findById('device', 10)) {                              
                        startStub.restore();
                        devFindFromDbStub.restore();
                        gadFindFromDbStub.restore();
                        callback();
                    }
                });

            fb.start(function (err) {
                done();
            });
        });

        it('should start multi netcore', function (done) {
            var startStub = sinon.stub(fakeNc, 'start', function (callback) {    
                    if (_.isFunction(callback)) {                              
                        startStub.restore();
                        expect(fb.findById('device', 1)).to.be.equal(undefined);
                        callback();
                    }
                }),
                startStub2 = sinon.stub(fakeNc2, 'start', function (callback) {    
                    if (_.isFunction(callback)) {                              
                        startStub2.restore();
                        expect(fb.findById('device', 1)).to.be.equal(undefined);
                        callback();
                    }
                });

            fbMultiNc.start(function (err) {
                done();
            });
        });
    });

    describe('#stop(callback)', function () {
        it('should stop netcore', function (done) {
            var stopStub = sinon.stub(fakeNc, 'stop', function (callback) {   
                    if (_.isFunction(callback)) {                 
                        stopStub.restore();
                        done();
                    }
                });

            fb.stop(function (err) {});
        });

        it('should stop multi netcore', function (done) {
            var stopStub = sinon.stub(fakeNc, 'stop', function (callback) {   
                    if (_.isFunction(callback)) {                 
                        stopStub.restore();  
                        callback();
                    }
                }),
                stopStub2 = sinon.stub(fakeNc2, 'stop', function (callback) {   
                    if (_.isFunction(callback)) {                 
                        stopStub2.restore();  
                        callback();
                    }
                });

            fbMultiNc.stop(function (err) {
                done();
            });
        });
    });

    describe('#reset(mode, callback)', function () {
        it('should reset netcore', function (done) {
            var resetStub = sinon.stub(fakeNc, 'reset', function (mode, callback) { 
                    if (mode === 0 && _.isFunction(callback)) {     
                        resetStub.restore();
                        callback();
                    }
                });

            fb.reset(0, function (err) {
                done();
            });
        });

        it('should reset multi netcore', function (done) {
            var resetStub = sinon.stub(fakeNc, 'reset', function (mode, callback) { 
                    if (mode === 0 && _.isFunction(callback)) {     
                        resetStub.restore();
                        callback();
                    }
                }),
                resetStub2 = sinon.stub(fakeNc2, 'reset', function (mode, callback) { 
                    if (mode === 0 && _.isFunction(callback)) {     
                        resetStub2.restore();
                        callback();
                    }
                });

            fbMultiNc.reset(0, function (err) {
                done();
            });
        });
    });

    describe('#permitJoin(duration, callback)', function () {
        it('should set netcore permitJoin', function (done) {
            var permitJoinStub = sinon.stub(fakeNc, 'permitJoin', function (duration, callback) { 
                    if (duration === 30 && _.isFunction(callback)) {     
                        permitJoinStub.restore();
                        callback();
                    }
                });

            fb.permitJoin(30, function (err) {
                done();
            });
        });        

        it('should permitJoin multi netcore', function (done) {
            var permitJoinStub = sinon.stub(fakeNc, 'permitJoin', function (duration, callback) { 
                    if (duration === 30 && _.isFunction(callback)) {     
                        permitJoinStub.restore();
                        callback();
                    }
                }),
                permitJoinStub2 = sinon.stub(fakeNc2, 'permitJoin', function (duration, callback) { 
                    if (duration === 30 && _.isFunction(callback)) {     
                        permitJoinStub2.restore();
                        callback();
                    }
                });

            fbMultiNc.permitJoin(30, function (err) {
                done();
            });
        });
    });

    describe('#remove(ncName, permAddr, callback)', function () {
        it('should remove device', function (done) {
            var removeStub = sinon.stub(fakeNc, 'remove', function (permAddr, callback) { 
                    if (permAddr === '00:00:00:00:00' && _.isFunction(callback)) {     
                        removeStub.restore();
                        callback();
                    }
                });

            fb.remove('fakeNc1', '00:00:00:00:00', function (err) {
                done();
            });
        });
    });

    describe('#ban(ncName, permAddr, callback)', function () {
        it('should ban device', function (done) {
            var banStub = sinon.stub(fakeNc, 'ban', function (permAddr, callback) { 
                    if (permAddr === '00:00:00:00:00' && _.isFunction(callback)) {     
                        banStub.restore();
                        callback();
                    }
                });

            fb.ban('fakeNc1', '00:00:00:00:00', function (err) {
                done();
            });
        });
    });

    describe('#unban(ncName, permAddr, callback)', function () {
        it('should unban device', function (done) {
            var unbanStub = sinon.stub(fakeNc, 'unban', function (permAddr, callback) { 
                    if (permAddr === '00:00:00:00:00' && _.isFunction(callback)) {     
                        unbanStub.restore();
                        callback();
                    }
                });

            fb.unban('fakeNc1', '00:00:00:00:00', function (err) {
                done();
            });
        });
    });

    describe('#ping(ncName, permAddr, callback)', function () {
          before(function(done) {
                fakeDev._recovering = true;
                fb.register('device', fakeDev, function (err, id) {
                    done();
                });
          });

        it('should ping device', function (done) {
            var pingStub = sinon.stub(fakeDev, 'ping', function (callback) { 
                    if (_.isFunction(callback)) {     
                        pingStub.restore();
                        callback();
                    }
                });

            fb.ping('fakeNc1', '00:00:00:00:00', function (err) {
                done();

            });
        });
    });

    describe('#maintain(ncName, callback)', function () {
        it('should maintain netcore', function (done) {
            var maintainStub = sinon.stub(fakeNc, 'maintain', function (callback) { 
                    if (_.isFunction(callback)) {     
                        maintainStub.restore();
                        callback();
                    }
                });

            fb.maintain(function (err) {
                done();
            }); 
        });

        it('should maintain multi netcore', function (done) {
            var maintainStub = sinon.stub(fakeNc, 'maintain', function (callback) { 
                    if (_.isFunction(callback)) {     
                        maintainStub.restore();
                        callback();
                    }
                }),
                maintainStub2 = sinon.stub(fakeNc2, 'maintain', function (callback) { 
                    if (_.isFunction(callback)) {     
                        maintainStub2.restore();
                        callback();
                    }
                });

            fbMultiNc.maintain(function (err) {
                done();
            }); 
        });
    });

    describe('#_fire(evt, data)', function () {
        it('should emit evt', function (done) {
            fb.on('testEvt', function (data) {
                if (data.result === 'test') 
                    done();
            });

            fb._fire('testEvt', { result: 'test'});
        });
    });    

    describe('#_tweet(subsys, indType, id, data)', function () {
        it('should _tweet evt', function (done) {
            var indicateStub = sinon.stub(fb._apiAgent, 'indicate', function (ind) {
                    if (_.isEqual(ind, {__intf: 'IND', subsys: 1, type: 'test', id: 1, data: 'test'}))
                        indicateStub.restore();
                        done();
                });

            fb._tweet('dev', 'test', 1, 'test');
        });
    });
});
