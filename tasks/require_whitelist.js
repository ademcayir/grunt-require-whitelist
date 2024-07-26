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
          'axios',
        //allowed core modules
        'crypto', 'dns', 'http', 'https', 'path', 'url', 'util',

        //engineering white-listed modules
        'soap', 'moment', 'apnagent', 'futures', 'goo.gl', 'mustache', 'request','timezone-js', 'twilio', 'underscore', 'underscore.string',
        'ursa', 'validator', 'xmldoc', 'xmldom', 'xpath', 'agentjs-commonlib', 'live-chat', 'vnodelib', 'node-jose', 'jsonwebtoken', 'xml-encryption'
      ],
    
    
    });
    
    var errorRequires = [ ];
    
    var done = this.async();
    console.log('Checking files: ');
    // Trying to minimize the ammount of bloat output 
    //console.log(this.filesSrc);
    
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
        if (require.ignore) {
            require.allowed = true;
            if (!require.allowed) {
                require.reason = 'not allowed becuase of ' + require.reason + ', but whitelist-ignore';
            } else {
                require.reason = 'whitelist-ignore';
            }
        }
    
        return require;
    }
    
    function logRequire(require){
        if(require.allowed){
            grunt.log.writeln(require.file + ' requires ' + require.requireString['grey'] + ': line ' + require.line + ' ' + require.reason['green']);
        }
        else{
            grunt.log.writeln(require.file + ' requires ' + require.requireString['grey'] + ': line ' + require.line + ' ' + require.reason['grey'] + " NOT ALLOWED");
        }
        
    }


    async.each(this.filesSrc, function(filepath, next) {
    
            var opts = { nodes: true, parse: { range: true, loc: true } };
          
            var filename = filepath;
            
            if(!grunt.file.isDir(filename)){
                var file = fs.readFileSync(filename);
                var requires = detective.find(file, opts);
           
                if(requires){
                    let dif = 0;
                    for(var i=0; i < requires.nodes.length; i++)
                    {
                        let node = requires.nodes[i];
                        let strings = requires.strings[i + dif];
                        let ignore = false;
                        let req_text = "";
                        try {
                            let filetext = "" + file;
                            let nextline = filetext.indexOf("\n", node.range[0]);
                            let line = filetext.substring(node.range[0],nextline);
                            if (line.indexOf("whitelist-ignore") !== -1) {
                                ignore = true;
                            }
                            req_text = filetext.substring(node.range[0], node.range[1]);
                            req_text = req_text.replace("require(", "");
                            req_text = req_text.replace(")", "");
                        } catch(e) {
                        }
                        if (node.arguments.length > 0) {
                            let type = node.arguments[0].type;
                            if (type === 'BinaryExpression') {
                                dif--;
                                strings = "Dynamic - " + req_text;
                            }
                        }
                        var temp = { file: filepath, requireString: strings, line: node.loc.start.line, ignore: ignore};
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
