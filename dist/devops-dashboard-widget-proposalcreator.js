(function(window, undefined) {'use strict';


angular.module('DevopsDashboard.widget.proposalcreator', ['adf.provider', 'summernote', 'ui.select'])
  .config(["dashboardProvider", function(dashboardProvider){
    dashboardProvider
      .widget('proposalcreator', {
        title: 'Proposal Creator',
        description: 'Quickly build new proposals from historic proposal data',
        authorizedGroups: ['root9b_all'],
        templateUrl: 'app/widgets/proposalcreator/src/view.html',
        edit: {
          templateUrl: 'app/widgets/proposalcreator/src/edit.html'
        },
        controller: 'proposalCtrl'
      });
  }])
  .factory('loadingModal', loadingModal)

  /** @ngInject */
  .controller('proposalCtrl', ["$scope", "$timeout", "loadingModal", function($scope, $timeout, loadingModal) {
    var socket = io('/proposals');
    var proposalSaveQueued = false;
    var previousSelectedTitle = '';

    socket.on('error', function(err) {
      console.error('Error:', err);
    });

    socket.on('sections', function(sections) {
      $timeout(function() {
        $scope.sections = sections;
      });
    });

    socket.on('saved', function() {
      $timeout(function() {
        $scope.savedMsg = 'Saved at ' + Date().toLocaleString();
      });
    });

    $scope.sections = [];
    $scope.proposalBody = "";
    $scope.savedMsg = "";
    $scope.searchString = "";
    $scope.proposalTitles = [];
    $scope.proposalTitle = {};

    $scope.search = function() {
      var q = $scope.searchString;

      if (q.length > 1) {
        socket.emit('search', $scope.searchString);
      } else {
        $timeout(function() {
          $scope.sections = [];
        });
      }
    };

    $scope.addSection = function(sectionIndex) {
      $scope.proposalBody += '<h2>' + $scope.sections[sectionIndex].sign + '</h2>';
      $scope.proposalBody += $scope.sections[sectionIndex].text + '<br/><br/>';
    };

    $scope.options = {
      height: 300,
      focus: true,
      airMode: false,
      toolbar: [
            ['edit',['undo','redo']],
            ['headline', ['style']],
            ['style', ['bold', 'italic', 'underline', 'superscript', 'subscript', 'strikethrough', 'clear']],
            ['fontface', ['fontname']],
            ['textsize', ['fontsize']],
            ['fontclr', ['color']],
            ['alignment', ['ul', 'ol', 'paragraph', 'lineheight']],
            ['height', ['height']],
            ['table', ['table']],
            ['insert', ['link','picture','video','hr']],
            ['view', ['fullscreen', 'codeview']],
            ['help', ['help']]
        ]
    };

    $scope.init = function() { console.log('Summernote is launched'); }
    $scope.enter = function() { console.log('Enter/Return key pressed'); }
    $scope.focus = function(e) { console.log('Editable area is focused'); }
    $scope.blur = function(e) { console.log('Editable area loses focus'); }
    $scope.paste = function(e) { console.log('Called event paste'); }
    $scope.change = function(contents) {
      console.log('contents are changed:', contents, $scope.editable);
      saveProposal();
    };
    $scope.keyup = function(e) { console.log('Key is released:', e.keyCode); }
    $scope.keydown = function(e) { console.log('Key is pressed:', e.keyCode); }
    $scope.imageUpload = function(files) {
      console.log('image upload:', files);
      console.log('image upload\'s editable:', $scope.editable);
    }
    var saveProposal = function() {
      if (!($scope.proposalTitle.selected)) {
        console.error('Proposal Title required');
        $timeout(function() {
          saveProposal();
        }, 5000);
        return;
      }

      if (proposalSaveQueued === false) {
        proposalSaveQueued = true;
        $timeout(function() {
          socket.emit('save', { title: $scope.proposalTitle.selected, body: $scope.proposalBody });
          proposalSaveQueued = false;
        }, 5000);
      }
    }

    var getProposal = function(title) {
      loadingModal.open();
      socket.emit('getproposal', title, function(proposal) {
        $scope.proposalBody = proposal.body;
        loadingModal.close();
      });
    };

    /* Retrieve a list of proposal titles from the database */
    $scope.getProposalTitles = function(search) {
      var newTitles = $scope.proposalTitles.slice();
      if (search && newTitles.indexOf(search) === -1) {
        newTitles.unshift(search);
      }
      return newTitles;
    };

    $scope.titleSelected = function(title) {
      if (previousSelectedTitle != title) {
        getProposal(title);
      }
    };

    /* Get a list of existing Proposal titles */
    socket.emit('gettitles', function(titles) {
      angular.copy(titles, $scope.proposalTitles);
    });
  }]);

  /** @ngInject */
function loadingModal($uibModal) {
  var methods = {};
  var opened = false;

  return {
    open: function() {
      if (!opened) {
        methods = $uibModal.open({
          animation: true,
          templateUrl: 'app/widgets/proposalcreator/src/loadingModal.html',
          keyboard: false,
          backdrop: 'static'
        });
        opened = true;
      } else {
        throw Error('Progress modal opened now');
      }
    }, 
    close: function() {
      if (opened) {
        methods.close();
        opened = false;
      } else {
        throw Error('Progress modal is not active');
      }
    }
  }
}
loadingModal.$inject = ["$uibModal"];;

angular.module("DevopsDashboard.widget.proposalcreator").run(["$templateCache", function($templateCache) {$templateCache.put("app/widgets/proposalcreator/src/edit.html","<form role=form><div class=form-group><label for=sample>Sample</label> <input type=text class=form-control id=sample ng-model=config.sample placeholder=\"Enter sample\"></div></form>");
$templateCache.put("app/widgets/proposalcreator/src/loadingModal.html","<div class=modal-content><div class=modal-body><div class=\"center-block loader\"></div></div></div><style>\n  .loader {\n    border: 16px solid #f3f3f3; /* Light grey */\n    border-top: 16px solid #3498db; /* Blue */\n    border-radius: 50%;\n    width: 120px;\n    height: 120px;\n    animation: spin 2s linear infinite;\n  }\n\n  @keyframes spin {\n    0% { transform: rotate(0deg); }\n    100% { transform: rotate(360deg); }\n  }\n</style>");
$templateCache.put("app/widgets/proposalcreator/src/view.html","<div class=ng-cloak><h3>Working Proposal</h3><div class=form-group><ui-select ng-model=proposalTitle.selected on-select=titleSelected($item)><ui-select-match placeholder=\"Select or search for a Proposal title ...\">{{$select.selected}}</ui-select-match><ui-select-choices repeat=\"title in getProposalTitles($select.search) | filter: $select.search\"><div ng-bind=title></div></ui-select-choices></ui-select></div><div class=form-group><summernote config=options ng-model=proposalBody on-init=init() on-enter=enter() on-focus=focus(evt) on-blur=blur(evt) on-paste=paste() on-keyup=keyup(evt) on-keydown=keydown(evt) on-change=change(contents) on-image-upload=imageUpload(files)></summernote><span class=pull-right>{{ savedMsg }}</span><hr><h3>Proposal Search</h3><input type=text class=form-control ng-model=searchString placeholder=\'Search: e.g. \"\" or \"\"\' ng-change=search()><ul ng-repeat=\"section in sections\"><li><div>{{ section.sign }}</div><div>{{ section.text }}</div></li><button ng-click=addSection($index)>Add Section</button></ul></div></div>");}]);})(window);