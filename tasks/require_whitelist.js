/*
 * grunt-require-whitelist
 * 
 *
 * Copyright (c) 2015 Matt Casella
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
  
  var detective = require('detective');
  var async = require('async');
  var fs = require('fs');

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('require_whitelist', 'Validate your NinaScript package to ensure required modules are on the Engineering whitelist', function () {

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
        allow: [ 
        //allowed core modules
        'crypto', 'dns', 'http', 'https', 'path', 'url',
        
        //engineering white-listed modules
        'soap', 'moment', 'apnagent', 'futures', 'goo.gl', 'mustache', 'request','timezone-js', 'twilio', 'underscore', 'underscore.string',
        'ursa', 'validator', 'xmldoc', 'xmldom', 'xpath', 'agentjs-commonlib', 'live-chat', 'vnodelib', 'node-jose', 'jsonwebtoken', 'xml-encryption'
      ],
    
    
    });
    
    var errorRequires = [ ];
    
    var done = this.async();
    console.log('Checking files: ');
    console.log(this.filesSrc);
    
    function checkRequire(require){
        var requireString = require.requireString;  
        require.allowed = false;
        require.reason  = 'not on whitelist';  
            
        //console.log('require=['+require+']');
        if(!require || !requireString){ return require; }
        
        //we allow all local requires
        if(requireString.indexOf('.') === 0){
            require.allowed = true;
            require.reason  = 'local';
        }
        else{
            //check if the module is on the whitelist
            var indexOf = grunt.util._.indexOf(options.allow, requireString);
            if(indexOf !== -1){
                require.allowed = true;
               require.reason = 'whitelisted';
            }
        }
    
        return require;
    }
    
    function logRequire(require){
        if(require.allowed){
            grunt.log.writeln(require.file + ' requires ' + require.requireString['grey'] + ': line ' + require.line + ' ' + require.reason['green']);
        }
        else{
            grunt.log.writeln(require.file + ' requires ' + require.requireString['red'].bold + ': line ' + require.line + ' ' + require.reason['red']);
        }
        
    }


    async.each(this.filesSrc, function(filepath, next) {
    
            var opts = { nodes: true, parse: { range: true, loc: true } };
          
            var filename = filepath;
            
            if(!grunt.file.isDir(filename)){
                var file = fs.readFileSync(filename);
                var requires = detective.find(file, opts);
           
                if(requires){
                    for(var i=0; i < requires.nodes.length; i++)
                    {
                        var temp = { file: filepath, requireString: requires.strings[i], line: requires.nodes[i].loc.start.line};
                        var require = checkRequire(temp);
                        
                        logRequire(require);
                        
                        if(!require.allowed){
                            errorRequires.push(require); 
                        }
                    }
                }
            }
            next();
            
            
    }, function(err) {
        // if any of the file processing produced an error, err would equal that error
        if( err ) {
          // One of the iterations produced an error.
          // All processing will now stop.
          console.log('A file failed to process');
        } else {
            grunt.log.writeln("");
            if(errorRequires.length > 0)
            {   
                grunt.log.error("The following require statements are not allowed:");
                errorRequires.forEach(function(require){
                                        grunt.log.write("\t");
                                        logRequire(require);
                                    });
                done(false);
            }
            else
            {
                grunt.log.ok("All require statements passed validation");
                done();
            }
        }
    });



  });
};
