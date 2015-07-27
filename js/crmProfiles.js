(function(angular, $, _) {
  angular.module('crmProfileUtils', []);

  angular.module('crmProfileUtils').factory('crmProfiles', function($q, crmApi){

    function loadNextScript(scripts, callback, fail) {
      var script = scripts.shift();
      CRM.$.getScript(CRM.config.resourceBase + script.url)
        .done(function(scriptData, status) {
          if(scripts.length) {
            loadNextScript(scripts, callback, fail);
          } else {
            callback();
          }
        }).fail(function(jqxhr, settings, exception) {
          fail(exception);
        });
    }

    function loadStyleFile(url) {
      CRM.$("#backbone_resources").append("<link href='"+url+"' />");
    }

    function loadBackbone() {
      var deferred = $q.defer();
      var scripts = [
        {url: 'packages/jquery/plugins/jstree/jquery.jstree.js', weight: 0},
        {url: 'packages/backbone/json2.js', weight: 100},
        {url: 'packages/backbone/backbone.js', weight: 120},
        {url: 'packages/backbone/backbone.marionette.js', weight: 125},
        {url: 'packages/backbone/backbone.collectionsubset.js', weight: 125},
        {url: 'packages/backbone-forms/distribution/backbone-forms.js', weight: 130},
        {url: 'packages/backbone-forms/distribution/adapters/backbone.bootstrap-modal.min.js', weight: 140},
        {url: 'packages/backbone-forms/distribution/editors/list.min.js', weight: 140},
        {url: 'js/crm.backbone.js', weight: 150},
        {url: 'js/model/crm.schema-mapped.js', weight: 200},
        {url: 'js/model/crm.uf.js', weight: 200},
        {url: 'js/model/crm.designer.js', weight: 200},
        {url: 'js/model/crm.profile-selector.js', weight: 200},
        {url: 'js/view/crm.designer.js', weight: 200},
        {url: 'js/view/crm.profile-selector.js', weight: 200},
        {url: 'js/jquery/jquery.crmProfileSelector.js', weight: 250},
        {url: 'js/crm.designerapp.js', weight: 250}
      ];

      scripts.sort(function(a, b){
        return a.weight-b.weight;
      });


      //mess with the jQuery versions
      CRM.origJQuery = window.jQuery;
      window.jQuery = CRM.$;

      //We need to put underscore on the global scope or backbone fails to load
      window._ = CRM._;

      loadStyleFile(CRM.config.resourceBase + 'packages/jquery/plugins/jstree/themes/default/style.css');
      loadStyleFile(CRM.config.resourceBase + 'packages/backbone-forms/distribution/templates/default.css');
      loadStyleFile(CRM.config.resourceBase + 'css/crm.designer.css');


      loadNextScript(scripts, function () {
        window.jQuery = CRM.origJQuery;
        delete CRM.origJQuery;
        delete window._;
        deferred.resolve(true);
      }, function(status) {
        deferred.resolve(status);
      });

      return deferred.promise;
    }

    function loadSettings() {
      var deferred = $q.defer();
      //Fetch the settings from the api
      crmApi('profile', 'getangularsettings').then(function(result) {
        if(result.hasOwnProperty('values')) {
          CRM.$.extend(CRM, result.values);
        }
        if (!verifyBackbone()) {
          loadBackbone().then(function() {
            deferred.resolve(true);
          });
        } else {
          deferred.resolve(true);
        }
      }, function(status) {
        deferred.reject(status);
      });
      return deferred.promise;
    }

    function loadTemplate() {
      var deferred = $q.defer();

      //Load the template;
      CRM.$("body").append("<div id='backbone_templates'></div>");
      CRM.$("#backbone_templates").load(CRM.url("civicrm/angularprofiles/template", {snippet: 5}), function(response) {
        deferred.resolve(response);
      });

      return deferred.promise;
    }
    function verifyBackbone() {
      return !!window.Backbone;
    }
    function verifyTemplate() {
      return (angular.element("#designer_template").length > 0);
    }
    function verifySettings() {
      return (!!CRM.PseudoConstant && !!CRM.initialProfileList && !!CRM.contactSubTypes && !!CRM.profilePreviewKey);
    }

    return {
      verify: function() {
        return (verifyBackbone() && verifyTemplate() && verifySettings());
      },
      load: function() {
        var deferred = $q.defer();
        var promises = [];

        if (CRM.$("#backbone_resources").length < 1) {
          CRM.$("body").append("<div id='backbone_resources'></div>");
        }

        if(!verifySettings()) {
          promises.push(loadSettings());
        } else if(!verifyBackbone()) {
          promises.push(loadBackbone());
        }

        if(!verifyTemplate()) {
          promises.push(loadTemplate());
        }

        $q.all(promises).then(
          function () {
            deferred.resolve(true);
          },
          function () {
            console.log("Failed to load all backbone resources");
            deferred.reject(ts("Failed to load all backbone resources"));
          }
        );

        return deferred.promise;
      }
    };
  });

})(angular, CRM.$, CRM._);