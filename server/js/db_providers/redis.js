var Utils = require('../utils');

var cls = require("../lib/class"),
    Player = require('../player'),
    Messages = require("../message"),
    redis = require("redis"),
    bcrypt = require("bcrypt");

module.exports = DatabaseHandler = cls.Class.extend({
    init: function(config){
        client = redis.createClient({
            socket: {
                host: config.redis_host,
                port: config.redis_port
            }
        });
        
        client.on('error', function(err) {
            console.log('Redis Client Error', err);
        });
        
        client.connect().then(function() {
            console.log('Redis client connected');
        }).catch(function(err) {
            console.log('Redis connection error:', err);
        });
    },
    loadPlayer: function(player){
        var self = this;
        var userKey = "u:" + player.name;
        var curTime = new Date().getTime();
        client.sMembers("usr").then(function(replies){
            for(var index = 0; index < replies.length; index++){
                if(replies[index].toString() === player.name){
                    client.multi()
                        .hGet(userKey, "pw") // 0
                        .hGet(userKey, "armor") // 1
                        .hGet(userKey, "weapon") // 2
                        .hGet(userKey, "exp") // 3
                        .hGet("b:" + player.connection._connection.remoteAddress, "time") // 4
                        .hGet("b:" + player.connection._connection.remoteAddress, "banUseTime") // 5
                        .hGet("b:" + player.connection._connection.remoteAddress, "loginTime") // 6
                        .hGet(userKey, "avatar") // 7
                        .zRange("adrank", "-1", "-1") // 8
                        .get("nextNewArmor") // 9
                        .hGet(userKey, "inventory0") // 10
                        .hGet(userKey, "inventory0:number") // 11
                        .hGet(userKey, "inventory1") // 12
                        .hGet(userKey, "inventory1:number") // 13
                        .hGet(userKey, "achievement1:found") // 14
                        .hGet(userKey, "achievement1:progress") // 15
                        .hGet(userKey, "achievement2:found") // 16
                        .hGet(userKey, "achievement2:progress") // 17
                        .hGet(userKey, "achievement3:found") // 18
                        .hGet(userKey, "achievement3:progress") // 19
                        .hGet(userKey, "achievement4:found") // 20
                        .hGet(userKey, "achievement4:progress") // 21
                        .hGet(userKey, "achievement5:found") // 22
                        .hGet(userKey, "achievement5:progress") // 23
                        .hGet(userKey, "achievement6:found") // 24
                        .hGet(userKey, "achievement6:progress") // 25
                        .sMembers("adminname") // 26
                        .zScore("adrank", player.name) // 27
                        .hGet(userKey, "weaponAvatar") // 28
                        .hGet(userKey, "x") // 29
                        .hGet(userKey, "y") // 30
                        .hGet(userKey, "achievement7:found") // 31
                        .hGet(userKey, "achievement7:progress") // 32
                        .hGet(userKey, "achievement8:found") // 33
                        .hGet(userKey, "achievement8:progress") // 34
                        .hGet("cb:" + player.connection._connection.remoteAddress, "etime") // 35
                        .exec().then(function(replies){
                            var pw = replies[0];
                            var armor = replies[1];
                            var weapon = replies[2];
                            var exp = Utils.NaN2Zero(replies[3]);
                            var bannedTime = Utils.NaN2Zero(replies[4]);
                            var banUseTime = Utils.NaN2Zero(replies[5]);
                            var lastLoginTime = Utils.NaN2Zero(replies[6]);
                            var avatar = replies[7];
                            var pubTopName = replies[8];
                            var nextNewArmor = replies[9];
                            var inventory = [replies[10], replies[12]];
                            var inventoryNumber = [
                              Utils.NaN2Zero(replies[11]),
                              Utils.NaN2Zero(replies[13])];
                            var achievementFound = [
                              Utils.trueFalse(replies[14]),
                              Utils.trueFalse(replies[16]),
                              Utils.trueFalse(replies[18]),
                              Utils.trueFalse(replies[20]),
                              Utils.trueFalse(replies[22]),
                              Utils.trueFalse(replies[24]),
                              Utils.trueFalse(replies[31]),
                              Utils.trueFalse(replies[33]),
                            ];
                            var achievementProgress = [
                              Utils.NaN2Zero(replies[15]),
                              Utils.NaN2Zero(replies[17]),
                              Utils.NaN2Zero(replies[19]),
                              Utils.NaN2Zero(replies[21]),
                              Utils.NaN2Zero(replies[23]),
                              Utils.NaN2Zero(replies[25]),
                              Utils.NaN2Zero(replies[32]),
                              Utils.NaN2Zero(replies[34]),
                            ];
                            var adminnames = replies[26];
                            var pubPoint =  Utils.NaN2Zero(replies[27]);
                            var weaponAvatar = replies[28] ? replies[28] : weapon;
                            var x = Utils.NaN2Zero(replies[29]);
                            var y = Utils.NaN2Zero(replies[30]);
                            var chatBanEndTime = Utils.NaN2Zero(replies[35]);

                            // Check Password

                            bcrypt.compare(player.pw, pw, function(err, res) {
                                if(!res) {
                                    player.connection.sendUTF8("invalidlogin");
                                    player.connection.close("Wrong Password: " + player.name);
                                    return;
                                }

                                var d = new Date();
                                var lastLoginTimeDate = new Date(lastLoginTime);
                                if(lastLoginTimeDate.getDate() !== d.getDate()
                                && pubPoint > 0){
                                  var targetInventoryNumber = -1;
                                  if(inventory[0] === "burger"){
                                    targetInventoryNumber = 0;
                                  } else if(inventory[1] === "burger"){
                                    targetInventoryNumber = 1;
                                  } else if(inventory[0] === null){
                                    targetInventoryNumber = 0;
                                  } else if(inventory[1] === null){
                                    targetInventoryNumber = 1;
                                  }

                                  if(targetInventoryNumber >= 0){
                                    if(pubPoint > 100){
                                      pubPoint = 100;
                                    }
                                    inventory[targetInventoryNumber] = "burger";
                                    inventoryNumber[targetInventoryNumber] += pubPoint*10;
                                    self.setInventory(player.name,
                                             Types.getKindFromString("burger"),
                                             targetInventoryNumber,
                                             inventoryNumber[targetInventoryNumber]);
                                    client.zrem("adrank", player.name);
                                  }
                                }

                                // Check Ban
                                d.setDate(d.getDate() - d.getDay());
                                d.setHours(0, 0, 0);
                                if(lastLoginTime < d.getTime()){
                                    log.info(player.name + "ban is initialized.");
                                    bannedTime = 0;
                                    client.hSet("b:" + player.connection._connection.remoteAddress, "time", bannedTime);
                                }
                                client.hSet("b:" + player.connection._connection.remoteAddress, "loginTime", curTime);

                                if(player.name === pubTopName.toString()){
                                    avatar = nextNewArmor;
                                }

                                var admin = null;
                                var i = 0;
                                for(i = 0; i < adminnames.length; i++){
                                    if(adminnames[i] === player.name){
                                        admin = 1;
                                        log.info("Admin " + player.name + "login");
                                    }
                                }
                                log.info("Player name: " + player.name);
                                log.info("Armor: " + armor);
                                log.info("Weapon: " + weapon);
                                log.info("Experience: " + exp);
                                log.info("Banned Time: " + (new Date(bannedTime)).toString());
                                log.info("Ban Use Time: " + (new Date(banUseTime)).toString());
                                log.info("Last Login Time: " + lastLoginTimeDate.toString());
                                log.info("Chatting Ban End Time: " + (new Date(chatBanEndTime)).toString());

                                player.sendWelcome(armor, weapon,
                                    avatar, weaponAvatar, exp, admin,
                                    bannedTime, banUseTime,
                                    inventory, inventoryNumber,
                                    achievementFound, achievementProgress,
                                    x, y,
                                    chatBanEndTime);
                            });
                    });
                    return;
                }
            }

            // Could not find the user
            player.connection.sendUTF8("invalidlogin");
            player.connection.close("User does not exist: " + player.name);
            return;
        });
    },

    createPlayer: function(player) {
        var userKey = "u:" + player.name;
        var curTime = new Date().getTime();

        // Check if username is taken
        client.sIsMember('usr', player.name).then(function(reply) {
            if(reply === true) {
                player.connection.sendUTF8("userexists");
                player.connection.close("Username not available: " + player.name);
                return;
            } else {
                // Add the player
                client.multi()
                    .sAdd("usr", player.name)
                    .hSet(userKey, "pw", player.pw)
                    .hSet(userKey, "email", player.email)
                    .hSet(userKey, "armor", "clotharmor")
                    .hSet(userKey, "avatar", "clotharmor")
                    .hSet(userKey, "weapon", "sword1")
                    .hSet(userKey, "exp", 0)
                    .hSet("b:" + player.connection._connection.remoteAddress, "loginTime", curTime)
                    .exec().then(function(replies){
                        log.info("New User: " + player.name);
                        player.sendWelcome(
                            "clotharmor", "sword1", "clotharmor", "sword1", 0,
                             null, 0, 0,
                             [null, null], [0, 0],
                             [false, false, false, false, false, false],
                             [0, 0, 0, 0, 0, 0],
                             player.x, player.y, 0);
                    });
            }
        });
    },

    checkBan: function(player){
        client.sMembers("ipban").then(function(replies){
            for(var index = 0; index < replies.length; index++){
                if(replies[index].toString() === player.connection._connection.remoteAddress){
                    client.multi()
                        .hGet("b:" + player.connection._connection.remoteAddress, "rtime")
                        .hGet("b:" + player.connection._connection.remoteAddress, "time")
                        .exec().then(function(replies){
                             var curTime = new Date();
                             var banEndTime = new Date(replies[0]*1);
                             log.info("curTime: " + curTime.toString());
                             log.info("banEndTime: " + banEndTime.toString());
                             if(banEndTime.getTime() > curTime.getTime()){
                                 player.connection.sendUTF8("ban");
                                 player.connection.close("IP Banned player: " + player.name + " " + player.connection._connection.remoteAddress);
                             }
                        });
                    return;
                }
            }
        });
    },
    banPlayer: function(adminPlayer, banPlayer, days){
        client.sMembers("adminname").then(function(replies){
            for(var index = 0; index < replies.length; index++){
                if(replies[index].toString() === adminPlayer.name){
                    var curTime = (new Date()).getTime();
                    client.sAdd("ipban", banPlayer.connection._connection.remoteAddress);
                    adminPlayer.server.pushBroadcast(new Messages.Chat(banPlayer, "/1 " + adminPlayer.name + "-- 밴 ->" + banPlayer.name + " " + days + "일"));
                    setTimeout( function(){ banPlayer.connection.close("Added IP Banned player: " + banPlayer.name + " " + banPlayer.connection._connection.remoteAddress); }, 30000);
                    client.hSet("b:" + banPlayer.connection._connection.remoteAddress, "rtime", (curTime+(days*24*60*60*1000)).toString());
                    log.info(adminPlayer.name + "-- BAN ->" + banPlayer.name + " to " + (new Date(curTime+(days*24*60*60*1000)).toString()));
                    return;
                }
            }
        });
    },
    chatBan: function(adminPlayer, targetPlayer) {
        client.sMembers("adminname").then(function(replies){
            for(var index = 0; index < replies.length; index++){
                if(replies[index].toString() === adminPlayer.name){
                    var curTime = (new Date()).getTime();
                    adminPlayer.server.pushBroadcast(new Messages.Chat(targetPlayer, "/1 " + adminPlayer.name + "-- 채금 ->" + targetPlayer.name + " 10분"));
                    targetPlayer.chatBanEndTime = curTime + (10*60*1000);
                    client.hSet("cb:" + targetPlayer.connection._connection.remoteAddress, "etime", (targetPlayer.chatBanEndTime).toString());
                    log.info(adminPlayer.name + "-- Chatting BAN ->" + targetPlayer.name + " to " + (new Date(targetPlayer.chatBanEndTime).toString()));
                    return;
                }
            }
        });
    },
    newBanPlayer: function(adminPlayer, banPlayer){
        log.debug("1");
        if(adminPlayer.experience > 100000){
            log.debug("2");
            client.hGet("b:" + adminPlayer.connection._connection.remoteAddress, "banUseTime").then(function(reply){
                log.debug("3");
                var curTime = new Date();
                log.debug("curTime: " + curTime.getTime());
                log.debug("bannable Time: " + (reply*1) + 1000*60*60*24);
                if(curTime.getTime() > (reply*1) + 1000*60*60*24){
                    log.debug("4");
                    banPlayer.bannedTime++;
                    var banMsg = "" + adminPlayer.name + "-- 밴 ->" + banPlayer.name + " " + banPlayer.bannedTime + "번째 " + (Math.pow(2,(banPlayer.bannedTime))/2) + "분";
                    client.sAdd("ipban", banPlayer.connection._connection.remoteAddress);
                    client.hSet("b:" + banPlayer.connection._connection.remoteAddress, "rtime", (curTime.getTime()+(Math.pow(2,(banPlayer.bannedTime))*500*60)).toString());
                    client.hSet("b:" + banPlayer.connection._connection.remoteAddress, "time", banPlayer.bannedTime.toString());
                    client.hSet("b:" + adminPlayer.connection._connection.remoteAddress, "banUseTime", curTime.getTime().toString());
                    setTimeout( function(){ banPlayer.connection.close("Added IP Banned player: " + banPlayer.name + " " + banPlayer.connection._connection.remoteAddress); }, 30000);
                    adminPlayer.server.pushBroadcast(new Messages.Chat(banPlayer, "/1 " + banMsg));
                    log.info(banMsg);
                }
                return;
            });
        }
    },
    banTerm: function(time){
        return Math.pow(2, time)*500*60;
    },
    equipArmor: function(name, armor){
        log.info("Set Armor: " + name + " " + armor);
        client.hSet("u:" + name, "armor", armor);
    },
    equipAvatar: function(name, armor){
        log.info("Set Avatar: " + name + " " + armor);
        client.hSet("u:" + name, "avatar", armor);
    },
    equipWeapon: function(name, weapon){
        log.info("Set Weapon: " + name + " " + weapon);
        client.hSet("u:" + name, "weapon", weapon);
    },
    setExp: function(name, exp){
        log.info("Set Exp: " + name + " " + exp);
        client.hSet("u:" + name, "exp", exp);
    },
    setInventory: function(name, itemKind, inventoryNumber, itemNumber){
        if(itemKind){
            client.hSet("u:" + name, "inventory" + inventoryNumber, Types.getKindAsString(itemKind));
            client.hSet("u:" + name, "inventory" + inventoryNumber + ":number", itemNumber);
           log.info("SetInventory: " + name + ", "
                                     + Types.getKindAsString(itemKind) + ", "
                                     + inventoryNumber + ", "
                                     + itemNumber);
        } else{
            this.makeEmptyInventory(name, inventoryNumber);
        }
    },
    makeEmptyInventory: function(name, number){
        log.info("Empty Inventory: " + name + " " + number);
        client.hDel("u:" + name, "inventory" + number);
        client.hDel("u:" + name, "inventory" + number + ":number");
    },
    foundAchievement: function(name, number){
        log.info("Found Achievement: " + name + " " + number);
        client.hSet("u:" + name, "achievement" + number + ":found", "true");
    },
    progressAchievement: function(name, number, progress){
        log.info("Progress Achievement: " + name + " " + number + " " + progress);
        client.hSet("u:" + name, "achievement" + number + ":progress", progress);
    },
    setUsedPubPts: function(name, usedPubPts){
        log.info("Set Used Pub Points: " + name + " " + usedPubPts);
        client.hSet("u:" + name, "usedPubPts", usedPubPts);
    },
    setCheckpoint: function(name, x, y){
        log.info("Set Check Point: " + name + " " + x + " " + y);
        client.hSet("u:" + name, "x", x);
        client.hSet("u:" + name, "y", y);
    },
    loadBoard: function(player, command, number, replyNumber){
      log.info("Load Board: " + player.name + " " + command + " " + number + " " + replyNumber);
      if(command === 'view'){
        client.multi()
        .hGet('bo:free', number+':title')
        .hGet('bo:free', number+':content')
        .hGet('bo:free', number+':writer')
        .hIncrBy('bo:free', number+':cnt', 1)
        .sMembers('bo:free:' + number + ':up')
        .sMembers('bo:free:' + number + ':down')
        .hGet('bo:free', number+':time')
        .exec().then(function(replies){
          var title = replies[0];
          var content = replies[1];
          var writer = replies[2];
          var counter = replies[3];
          var up = replies[4].length;
          var down = replies[5].length;
          var time = replies[6];
          player.send([Types.Messages.BOARD,
                       'view',
                       title,
                       content,
                       writer,
                       counter,
                       up,
                       down,
                       time]);
        });
      } else if(command === 'reply'){
        client.multi()
        .hGet('bo:free', number+':reply:'+replyNumber+':writer')
        .hGet('bo:free', number+':reply:'+replyNumber+':content')
        .sMembers('bo:free:' + number+':reply:'+replyNumber+':up')
        .sMembers('bo:free:' + number+':reply:'+replyNumber+':down')

        .hGet('bo:free', number+':reply:'+(replyNumber+1)+':writer')
        .hGet('bo:free', number+':reply:'+(replyNumber+1)+':content')
        .sMembers('bo:free:' + number+':reply:'+(replyNumber+1)+':up')
        .sMembers('bo:free:' + number+':reply:'+(replyNumber+1)+':down')

        .hGet('bo:free', number+':reply:'+(replyNumber+2)+':writer')
        .hGet('bo:free', number+':reply:'+(replyNumber+2)+':content')
        .sMembers('bo:free:' + number+':reply:'+(replyNumber+2)+':up')
        .sMembers('bo:free:' + number+':reply:'+(replyNumber+2)+':down')

        .hGet('bo:free', number+':reply:'+(replyNumber+3)+':writer')
        .hGet('bo:free', number+':reply:'+(replyNumber+3)+':content')
        .sMembers('bo:free:' + number+':reply:'+(replyNumber+3)+':up')
        .sMembers('bo:free:' + number+':reply:'+(replyNumber+3)+':down')

        .hGet('bo:free', number+':reply:'+(replyNumber+4)+':writer')
        .hGet('bo:free', number+':reply:'+(replyNumber+4)+':content')
        .sMembers('bo:free:' + number+':reply:'+(replyNumber+4)+':up')
        .sMembers('bo:free:' + number+':reply:'+(replyNumber+4)+':down')

        .exec().then(function(replies){
          player.send([Types.Messages.BOARD,
                       'reply',
                        replies[0],  replies[1],  replies[2].length, replies[3].length,
                        replies[4],  replies[5],  replies[6].length, replies[7].length,
                        replies[8],  replies[9],  replies[10].length, replies[11].length,
                        replies[12], replies[13], replies[14].length, replies[15].length,
                        replies[16], replies[17], replies[18].length, replies[19].length]);
        });
      } else if(command === 'up'){
        if(player.level >= 50){
          client.sAdd('bo:free:' + number + ':up', player.name);
        }
      } else if(command === 'down'){
        if(player.level >= 50){
          client.sAdd('bo:free:' + number + ':down', player.name);
        }
      } else if(command === 'replyup'){
        if(player.level >= 50){
          client.sAdd('bo:free:'+number+':reply:'+replyNumber+':up', player.name);
        }
      } else if(command === 'replydown'){
        if(player.level >= 50){
          client.sAdd('bo:free:'+number+':reply:'+replyNumber+':down', player.name);
        }
      } else if(command === 'list'){
        client.hGet('bo:free', 'lastnum').then(function(reply){
          var lastnum = reply;
          if(number > 0){
            lastnum = number;
          }
          client.multi()
          .hGet('bo:free', lastnum +':title')
          .hGet('bo:free', (lastnum-1) +':title')
          .hGet('bo:free', (lastnum-2) +':title')
          .hGet('bo:free', (lastnum-3) +':title')
          .hGet('bo:free', (lastnum-4) +':title')
          .hGet('bo:free', (lastnum-5) +':title')
          .hGet('bo:free', (lastnum-6) +':title')
          .hGet('bo:free', (lastnum-7) +':title')
          .hGet('bo:free', (lastnum-8) +':title')
          .hGet('bo:free', (lastnum-9) +':title')

          .hGet('bo:free', lastnum +':writer')
          .hGet('bo:free', (lastnum-1) +':writer')
          .hGet('bo:free', (lastnum-2) +':writer')
          .hGet('bo:free', (lastnum-3) +':writer')
          .hGet('bo:free', (lastnum-4) +':writer')
          .hGet('bo:free', (lastnum-5) +':writer')
          .hGet('bo:free', (lastnum-6) +':writer')
          .hGet('bo:free', (lastnum-7) +':writer')
          .hGet('bo:free', (lastnum-8) +':writer')
          .hGet('bo:free', (lastnum-9) +':writer')

          .hGet('bo:free', lastnum +':cnt')
          .hGet('bo:free', (lastnum-1) +':cnt')
          .hGet('bo:free', (lastnum-2) +':cnt')
          .hGet('bo:free', (lastnum-3) +':cnt')
          .hGet('bo:free', (lastnum-4) +':cnt')
          .hGet('bo:free', (lastnum-5) +':cnt')
          .hGet('bo:free', (lastnum-6) +':cnt')
          .hGet('bo:free', (lastnum-7) +':cnt')
          .hGet('bo:free', (lastnum-8) +':cnt')
          .hGet('bo:free', (lastnum-9) +':cnt')

          .sMembers('bo:free:' + lastnum + ':up')
          .sMembers('bo:free:' + (lastnum-1) + ':up')
          .sMembers('bo:free:' + (lastnum-2) + ':up')
          .sMembers('bo:free:' + (lastnum-3) + ':up')
          .sMembers('bo:free:' + (lastnum-4) + ':up')
          .sMembers('bo:free:' + (lastnum-5) + ':up')
          .sMembers('bo:free:' + (lastnum-6) + ':up')
          .sMembers('bo:free:' + (lastnum-7) + ':up')
          .sMembers('bo:free:' + (lastnum-8) + ':up')
          .sMembers('bo:free:' + (lastnum-9) + ':up')

          .sMembers('bo:free:' + lastnum + ':down')
          .sMembers('bo:free:' + (lastnum-1) + ':down')
          .sMembers('bo:free:' + (lastnum-2) + ':down')
          .sMembers('bo:free:' + (lastnum-3) + ':down')
          .sMembers('bo:free:' + (lastnum-4) + ':down')
          .sMembers('bo:free:' + (lastnum-5) + ':down')
          .sMembers('bo:free:' + (lastnum-6) + ':down')
          .sMembers('bo:free:' + (lastnum-7) + ':down')
          .sMembers('bo:free:' + (lastnum-8) + ':down')
          .sMembers('bo:free:' + (lastnum-9) + ':down')

          .hGet('bo:free', lastnum + ':replynum')
          .hGet('bo:free', (lastnum+1) + ':replynum')
          .hGet('bo:free', (lastnum+2) + ':replynum')
          .hGet('bo:free', (lastnum+3) + ':replynum')
          .hGet('bo:free', (lastnum+4) + ':replynum')
          .hGet('bo:free', (lastnum+5) + ':replynum')
          .hGet('bo:free', (lastnum+6) + ':replynum')
          .hGet('bo:free', (lastnum+7) + ':replynum')
          .hGet('bo:free', (lastnum+8) + ':replynum')
          .hGet('bo:free', (lastnum+9) + ':replynum')

          .exec().then(function(replies){
            var i=0;
            var msg = [Types.Messages.BOARD, 'list', lastnum];

            for(i=0; i<30; i++){
                msg.push(replies[i]);
            }
            for(i=30; i<50; i++){
                msg.push(replies[i].length);
            }
            for(i=50; i<60; i++){
                msg.push(replies[i]);
            }

            player.send(msg);
          });
        });
      }
    },
    writeBoard: function(player, title, content){
      log.info("Write Board: " + player.name + " " + title);
      client.hIncrBy('bo:free', 'lastnum', 1).then(function(reply){
        var curTime = new Date().getTime();
        var number = reply ? reply : 1;
        client.multi()
        .hSet('bo:free', number+':title', title)
        .hSet('bo:free', number+':content', content)
        .hSet('bo:free', number+':writer', player.name)
        .hSet('bo:free', number+':time', curTime)
        .exec();
        player.send([Types.Messages.BOARD,
                     'view',
                     title,
                     content,
                     player.name,
                     0,
                     0,
                     0,
                     curTime]);
      });
    },
    writeReply: function(player, content, number){
      log.info("Write Reply: " + player.name + " " + content + " " + number);
      var self = this;
      client.hIncrBy('bo:free', number + ':replynum', 1).then(function(reply){
        var replyNum = reply ? reply : 1;
        client.multi()
        .hSet('bo:free', number+':reply:'+replyNum+':content', content)
        .hSet('bo:free', number+':reply:'+replyNum+':writer', player.name)
        .exec().then(function(replies){
          player.send([Types.Messages.BOARD,
                       'reply',
                       player.name,
                       content]);
        });
      });
    },
    pushKungWord: function(player, word){
      var server = player.server;

      if(player === server.lastKungPlayer){ return; }
      if(server.isAlreadyKung(word)){ return; }
      if(!server.isRightKungWord(word)){ return; }

      if(server.kungWords.length === 0){
        client.sRandMember('dic').then(function(reply){
          var randWord = reply;
          server.pushKungWord(player, randWord);
        });
      } else{
        client.sIsMember('dic', word).then(function(reply){
          if(reply === true){
            server.pushKungWord(player, word);
          } else{
            player.send([Types.Messages.NOTIFY, word + "는 사전에 없습니다."]);
          }
        });
      }
    }
});
