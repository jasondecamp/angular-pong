angular.module('angular-pong',['ngSanitize','ngAnimate'])
  .directive('pongCourt', function() {
    return {
      restrict: 'E',
      controller: 'pongController',
      scope: true,
      template: ('<pong-ball x="{{ball.x}}" y="{{ball.y}}"></pong-ball>'+
        '<pong-paddle side="left" y="{{paddles.left.y}}"></pong-paddle>'+
        '<pong-paddle side="right" y="{{paddles.right.y}}"></pong-paddle>'+
        '<div class="score">'+
          '<span class="left" ng-class="{winner:scores.left==11}" ng-bind="scores.left"></span>'+
          '<span class="divider">:</span>'+
          '<span class="right" ng-class="{winner:scores.right==11}" ng-bind="scores.right"></span>'+
        '</div>'+
        '<span class="message" ng-show="message" ng-bind-html="message"></span>')
    }
  })
  .directive('pongBall', function() {
    return {
    restrict: 'E',
    require: '^pongCourt',
    link: function(scope, element, attrs) {
      element.addClass('ball');
      element.css('height', scope.ball.height);
      element.css('width', scope.ball.width);
      scope.$watch(
        function() { return attrs.x; },
        function(x) {
          element.css('left', x + 'px');
        }
      );
      scope.$watch(
        function() { return attrs.y; },
        function(y) {
          element.css('top', y + 'px');
        }
      );
      }
    };
  })
  .directive('pongPaddle', function() {
    return {
      restrict: 'E',
      require: '^pongCourt',
      link: function(scope, element, attrs) {
        element.addClass('paddle');
        element.css('height', scope.paddles.height + 'px');
        element.css('width', scope.paddles.width + 'px');
        if('left' == attrs.side) {
          element.css('float', 'left');
        }
        if('right' == attrs.side) {
          element.css('float', 'right');
        }
        scope.$watch(
          function() { return attrs.y; },
          function(y) {
            element.css('top', y + 'px');
          }
        );
      }
    };
  })
  .controller('pongController',
    ['$scope','$element','$attrs','$interval','$timeout','$sce',
    function($scope,$element,$attrs,$interval,$timeout,$sce) {
      window.court = $element[0];
      // configurable
      var settings = {
        soundOn: 1,
        paddleSpeed: 50,
        keyMap: {
          13: 'enter', // enter
          27: 'escape', // escape
          38: 'rightup',  // up arrow
          40: 'rightdown' // down arrow
        },
        smack: false
      };

      // statics
      var sounds = {
        wall: new Audio("pong_8bit_wall.wav"),
        paddle: new Audio("pong_8bit_paddle.wav"),
        out: new Audio("pong_8bit_out.wav")
      }

      //--> TODO: work on these messages
      var messages = {
        ai: [
          'The robots will always win.',
          'I bet you\'re the one that gets lost in the guided tour.',
          'Your aim is so poor Bono is holding a charity concert for it.',
          'Maybe you should go back to farmville',
          'Are you not entertained!?',
          'Need some help? Pressing ctrl+alt+del will give you a power-up...'
        ],
        human: [
          'Pshhh, lucky shot',
          'Hey, I wasn\'t looking!',
          'Timeout! I called a timeout!?!',
          'I\'m gonna remember this... just please don\'t delete your cookies.',
          'Ok, time for me to stop holding back...'
        ]
      }

      // state variables
      var init = function() {
        $scope.scores = {
          left: 0,
          right: 0
        };
        $scope.gameover = false;
        $scope.active = false;
        $scope.message = 'Wanna play a game? <span class="hint">press enter to start</hint>';
      }
      init();
      var sideOut, messageTimeout;

      // environment dependent variables
      var paddleHeight = Math.floor(court.clientHeight*0.15);
      var paddleMaxY = court.clientHeight - paddleHeight;
      var intervals = {};

      // event handlers
      var controls = {
        enter: function() {
          if(!$scope.active) serve();
        },
        escape: function() {
          if($scope.gameover) {
            init();
          }
          if(!$scope.active) return;
          if(isPaused()) startGame();
          else stopGame();
        },
        rightup: function() {
          $scope.paddles.move('right','up');
        },
        rightdown: function() {
          $scope.paddles.move('right','down');
        },
        rightupStop: function() {
          $scope.paddles.resetVelocity('right');
        },
        rightdownStop: function () {
          $scope.paddles.resetVelocity('right');
        },
        leftup: function() {
          $scope.paddles.move('left','up');
        },
        leftdown: function() {
          $scope.paddles.move('left','down');
        },
        leftupStop: function() {
          $scope.paddles.resetVelocity('left');
        },
        leftdownStop: function() {
          $scope.paddles.resetVelocity('left');
        }
      };

      // paddle object
      $scope.paddles = {
        height: paddleHeight,
        width: 15,
        left: {
          y: paddleMaxY/2,
          velocity: 0
        },
        right: {
          y: paddleMaxY/2,
          velocity: 0
        },
        move: function(side, direction) {
          if(isPaused() && $scope.active) return;
          this[side].ts = new Date().getTime();
          if(angular.isDefined(intervals[side + direction])) return;
          var sign = ('up' == direction) ? -1 : 1;
          intervals[side + direction] = $interval(function() {
            // Boundary Conditions
            if((1 == sign && paddleMaxY <= $scope.paddles[side].y) ||
              (-1 == sign && 0 >= $scope.paddles[side].y)) {
              return;
            }
            // calculate accelerated velocity
            if($scope.paddles[side].velocity >= 200)
              $scope.paddles[side].velocity = 200;
            else $scope.paddles[side].velocity++;
            $scope.paddles[side].y += (settings.paddleSpeed/5 +
              $scope.paddles[side].velocity/10)*sign;
            $scope.paddles[side].direction = direction;
          }, 10);
        },
        top: function(side) {
          return this[side].y;
        },
        bottom: function(side) {
          return this[side].y + this.height;
        },
        face: function(side) {
          var x = this.width;
          if('right' == side) {
            x = court.clientWidth - this.width;
          }
          return x;
        },
        center: function(side) {
          return this[side].y + (this.height/2);
        },
        resetVelocity: function(side) {
          $scope.paddles[side].velocity = 0;
        },
        auto: function(side) {
          if($scope.ball.x < court.clientHeight/10 && randomInt(2)<=25) {
            var direction = ($scope.ball.y > this.center(side)) ? 'down' : 'up';
            if('up' == direction) cancelInterval(side + 'down');
            else if('down' == direction) cancelInterval(side + 'up');
            if(!angular.isDefined(intervals[side + direction]))
              this.move(side, direction);
          } else if(($scope.ball.x < court.clientHeight/2 && randomInt(2)<=95) ||
            (randomInt(2)<=5)) {
            var direction = ($scope.ball.y > this.center(side)) ? 'down' : 'up';
            if('up' == direction) cancelInterval(side + 'down');
            else if('down' == direction) cancelInterval(side + 'up');
            if(this.top(side) < $scope.ball.y && $scope.ball.y < this.bottom(side))
              return;
            if(!angular.isDefined(intervals[side + direction]))
              this.move(side, direction);
          } else {
            cancelInterval(side + 'down');
            cancelInterval(side + 'up');
          }
        }
      };

      // ball object
      $scope.ball = {
        height: 15,
        width: 15,
        x: -50,
        y: Number(court.clientHeight/2),
        velocities: {
          x: 0,
          y: 0
        },
        touchesTop: function() {
          return this.y <= 0;
        },
        touchesBottom: function() {
          return court.clientHeight <= this.y + this.height;
        },
        touchesLeft: function() {
          return this.x <= 0;
        },
        touchesRight: function() {
          return court.clientWidth <= this.x + this.width;
        },
        touchesPaddle: function() {
          var side = this.direction();
          var face = $scope.paddles.face(side);
          var top = $scope.paddles.top(side);
          var bottom = $scope.paddles.bottom(side);
          var sign = ('left' == side) ? 1 : -1;
          if(this.x * sign + face <= $scope.paddles.width &&
            top < this.y + this.height && this.y < bottom) return true;
          return false;
        },
        isOut: function() {
          if(this.touchesLeft() || this.touchesRight())
          return this.touchesLeft() || this.touchesRight();
        },
        redirect: function(side) {
          var sign = ('up' == $scope.paddles[side].direction) ? 1 : -1;
          this.velocities.y += ($scope.paddles[side].velocity * sign * 10 +
            getRandomVelocity('y')/8);
          this.velocities.y = this.velocities.y > 0 ?
            Math.min(this.velocities.y,court.clientHeight*2) :
            Math.max(this.velocities.y,court.clientHeight*-2)
          this.velocities.x += (this.velocities.x * 0.05); // 5% faster each hit
        },
        direction: function() {
          var direction = 'left';
          if(this.velocities.x < 0) { direction = 'right'; }
          return direction;
        },
        setFinalX: function() {
          this.x = 0;
          if(this.direction() == 'right') {
            this.x = court.clientWidth - this.width;
          }
        }
      };

      // Game mechanics
      function serve() {
        if($scope.active) return;
        // game over
        if($scope.gameover) {
          $scope.message = 'GAME OVER<span class="hint">press esc to reset</hint>'
          return;
        }
        $scope.active = true;
        // hide message
        if(messageTimeout) $timeout.cancel(messageTimeout);
        $scope.message = null;
        var sign = 1;
        if(undefined == sideOut) {
          var sides = ['left', 'right'];
          sideOut = sides[Math.floor(Math.random()*10)%2];
        }
        $scope.ball.x = court.clientWidth-$scope.ball.width-1;
        $scope.ball.y = $scope.paddles.center('right');
        $scope.ball.velocities.x = getRandomVelocity('x');
        $scope.ball.velocities.y = getRandomVelocity('y');
        if('right' == sideOut) {
          $scope.ball.x = 1;
          $scope.ball.y = $scope.paddles.center('left');
          // make sure the ball is going the right direction
          if(0 <= $scope.ball.velocities.x) { sign = -1; }
        }
        // make sure the ball is going the right direction
        else if(0 > $scope.ball.velocities.x) {
          sign = -1;
        }
        $scope.ball.velocities.x *= sign;
        startGame();
      }
      function startGame() {
        var tick = undefined;
        if(angular.isDefined(intervals.ball)) return;
        intervals.ball = $interval(function() {
          $scope.paddles.auto('left');
          var now = new Date().getTime();
          var elapsed = tick ? tick - now : 0;
          tick = now;

          updateBallPosition('y', elapsed);
          updateBallDirection('y', $scope.ball.y);
          updateBallPosition('x', elapsed);
          updateBallDirection('x', $scope.ball.x);

        }, 10);
      }
      function stopGame() {
        if(angular.isDefined(intervals.ball)) {
          cancelInterval('ball');
          intervals.ball = undefined;
        }
      }
      function updateBallPosition(axis, elapsed) {
        var velocity = $scope.ball.velocities[axis]/1000;
        $scope.ball[axis] += Math.round(elapsed * velocity);
      }
      function updateBallDirection(axis, value) {
        function bounce(axis, edge) {
          var dimensions = {
            x: {
              max:court.clientWidth-$scope.ball.width-$scope.paddles.width,
              min:$scope.paddles.width
            },
            y: {
              max:court.clientHeight-$scope.ball.height,
              min:0
            }
          };
          $scope.ball[axis] = 2 * dimensions[axis][edge] - $scope.ball[axis];
          $scope.ball.velocities[axis] *= -1;
          if('y' == axis) { playSound('wall'); }
          if('x' == axis) { playSound('paddle'); }
        }
        if($scope.ball.touchesTop()) {
          console.log('up',$scope.ball.velocities.y);
          bounce('y', 'min');
          console.log('down',$scope.ball.velocities.y);
          return;
        }
        if($scope.ball.touchesBottom()) {
          bounce('y', 'max');
          return;
        }
        if($scope.ball.touchesPaddle()) {
          var side = $scope.ball.direction();
          $scope.ball.redirect(side);
          if(side == 'left') bounce('x', 'min');
          else bounce('x', 'max');
          return;
        }
        if($scope.ball.isOut()) {
          $scope.ball.setFinalX();
          sideOut = $scope.ball.direction();
          $scope.scores[otherSide(sideOut)]++
          playSound('out');
          postMessage(otherSide(sideOut));
          $scope.active = false;
          stopGame();
          return;
        }
      }


      // utilities
      function isPaused() {
        return !angular.isDefined(intervals.ball)
      }
      function playSound(sound) {
        if(0 == settings.soundOn ) { return; }
        if(undefined != sounds[sound]) {
          sounds[sound].play();
        }
      }
      function postMessage(side) {
        if(messageTimeout) $timeout.cancel(messageTimeout);
        if($scope.scores[side]==11) {
          $scope.gameover = true;
          $scope.message = 'GAME OVER <span class="hint">Well that was fun... '+
            'don\'t you have better things to do, human?</span>';
            return;
        } else if(settings.smack && side=='right') {
          $scope.message = messages.human[Math.floor((messages.human.length-1)*Math.random())];
        } else if(settings.smack && side=='left') {
          $scope.message = messages.ai[Math.floor((messages.ai.length-1)*Math.random())];
        }
        if($scope.message) messageTimeout = $timeout(function(){ $scope.message = null; },5000);
      }
      function cancelInterval(interval) {
        if(angular.isDefined(interval) && undefined != intervals[interval]) {
          $interval.cancel(intervals[interval]);
          if(angular.isFunction(controls[interval + 'Stop'])) {
            controls[interval + 'Stop']();
          }
          intervals[interval] = undefined;
        }
      }
      function otherSide(side) {
        var other = {
          left: 'right',
          right: 'left'
        }
        if(undefined != other[side]) return other[side];
      }
      function getRandomVelocity(axis) {
        var dimension = 'Height';
        var precision = 3;
        if('x' == axis) {
          dimension = 'Width';
          precision = 2;
        }
        var side = court['client' + dimension];
        var halfSide = side/2;
        var sign = randomSign();
        var rand = randomInt(precision);
        var sizeAdjustment = 1 - (100/side);
        var mod = (rand * sizeAdjustment) * sign;
        return Math.round(halfSide + mod);
      }
      function randomInt(p) {
        return Math.floor(
          Math.random().toPrecision(p)*Math.pow(10,p)
        );
      }
      function randomSign() {
        var randNum = randomInt(1);
        return (randNum % 2) ? 1 : -1;
      };
      angular.element(document).on('keydown .pong', function(e) {
        if(angular.isFunction(controls[settings.keyMap[e.keyCode]])) {
          controls[settings.keyMap[e.keyCode]]();
          $scope.$apply();
        }
      });
      angular.element(document).on('keyup .pong', function(e) {
        if(angular.isFunction(controls[settings.keyMap[e.keyCode]])) {
          cancelInterval(settings.keyMap[e.keyCode]);
          $scope.$apply();
        }
      });
      // cleanup bindings
      $scope.$on('$destroy',function() {
        angular.element(document).off('.pong');
      });

    }
  ]);
