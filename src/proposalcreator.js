'use strict';

angular.module('DevopsDashboard.widget.proposalcreator', ['adf.provider', 'summernote', 'ui.select'])
  .config(function(dashboardProvider){
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
  })
  .factory('loadingModal', loadingModal)

  /** @ngInject */
  .controller('proposalCtrl', function($scope, $timeout, loadingModal) {
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
  });

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
};
