(function() {
  var QUnit, markup, q, util, wiki;

  util = require('util');

  if (typeof QUnit === "undefined" || QUnit === null) {
    QUnit = require('qunit-cli');
  }

  q = QUnit;

  q.module('wiki');

  wiki = require('../wiki');

  q.test('tempFile', function() {
    q.stop();
    return wiki.tempFile(function(err, filename) {
      q.ok(filename, 'Temporary filename is generated');
      return q.start();
    });
  });

  q.test('filename', function() {
    q.equal(wiki.filename('test'), 'test.md', 'Simple file');
    q.equal(wiki.filename('test/'), 'test/', 'Simple folder');
    return q.equal(wiki.filename('testDir/testFile'), 'testDir/testFile.md', 'File in folder');
  });

  q.test('replaceWikiLinks', function() {
    var testDoc1, testDoc1_expect, testDoc1_res;
    testDoc1 = [
      {
        "docTitle": [],
        "docAuthors": [],
        "docDate": []
      }, [
        {
          "Link": [
            [
              {
                "Str": "Front"
              }, "Space", {
                "Str": "Page"
              }
            ], ["", ""]
          ]
        }
      ]
    ];
    testDoc1_expect = [
      {
        "docTitle": [],
        "docAuthors": [],
        "docDate": []
      }, [
        {
          "Link": [
            [
              {
                "Str": "Front"
              }, "Space", {
                "Str": "Page"
              }
            ], ["/pages/Front%20Page.md/view", ""]
          ]
        }
      ]
    ];
    testDoc1_res = wiki.replaceWikiLinks(testDoc1);
    return q.deepEqual(testDoc1_res, testDoc1_expect, 'Simple document behaves properly');
  });

  q.test('replaceImages', function() {
    var testDoc1, testDoc1_expect, testDoc1_res, testDoc2, testDoc2_expect, testDoc2_res;
    testDoc1 = [
      {
        "docTitle": [],
        "docAuthors": [],
        "docDate": []
      }, [
        {
          "Para": [
            {
              "Str": "Hello"
            }, "Space", {
              "Str": "world!"
            }, "Space", {
              "Str": "This"
            }, "Space", {
              "Str": "is"
            }, "Space", {
              "Str": "the"
            }, "Space", {
              "Str": "new"
            }, "Space", {
              "Str": "Main"
            }, "Space", {
              "Str": "Page"
            }
          ]
        }, {
          "Para": [
            {
              "Image": [
                [
                  {
                    "Str": "Some"
                  }, "Space", {
                    "Str": "image"
                  }, "Space", {
                    "Str": "goes"
                  }, "Space", {
                    "Str": "here"
                  }
                ], ["http://upload.wikimedia.org/wikipedia/commons/thumb/2/26/YellowLabradorLooking_new.jpg/260px-YellowLabradorLooking_new.jpg", "fig:"]
              ]
            }
          ]
        }
      ]
    ];
    testDoc1_expect = testDoc1;
    testDoc1_res = wiki.replaceWikiLinks(testDoc1);
    q.deepEqual(testDoc1_res, testDoc1_expect, 'Image with fully qualified URI is unchanged');
    testDoc2 = [
      {
        "docTitle": [],
        "docAuthors": [],
        "docDate": []
      }, [
        {
          "Para": [
            {
              "Image": [
                [
                  {
                    "Str": "Some"
                  }, "Space", {
                    "Str": "image"
                  }, "Space", {
                    "Str": "goes"
                  }, "Space", {
                    "Str": "here"
                  }
                ], ["260px-YellowLabradorLooking_new.jpg", "fig:"]
              ]
            }
          ]
        }
      ]
    ];
    testDoc2_expect = [
      {
        "docTitle": [],
        "docAuthors": [],
        "docDate": []
      }, [
        {
          "Para": [
            {
              "Image": [
                [
                  {
                    "Str": "Some"
                  }, "Space", {
                    "Str": "image"
                  }, "Space", {
                    "Str": "goes"
                  }, "Space", {
                    "Str": "here"
                  }
                ], ["/files/260px-YellowLabradorLooking_new.jpg", "fig:"]
              ]
            }
          ]
        }
      ]
    ];
    testDoc2_res = wiki.replaceWikiLinks(testDoc2);
    return q.deepEqual(testDoc2_res, testDoc2_expect, 'Image without fully qualified URI is changed to include a file path');
  });

  q.module('markup');

  markup = require('../markup');

  q.test('pipeline', function() {
    var text1, text2;
    text1 = "* Metadata: `[[metadata]]`\n* Categories: `[[#category]]`\n* Replacements: `{{replacement}}`\n	* Transclusion: `{{>page}}`\n	* Templates: `{{template|option1|option2|named_option=value}}`\n	* Alternatively:";
    q.stop();
    markup.pipeline(text1, 'markdown', 'html', [], [
      function(tree, cb) {
        q.ok(tree, 'A tree is passed to the first middleware');
        return cb(null, tree);
      }
    ], function(err, html) {
      q.ok(err == null, 'No error is raised in the pipeline');
      q.ok(html != null, 'Some HTML is returned');
      return q.start();
    });
    text2 = "[Test wikilink]()";
    q.stop();
    return markup.pipeline(text2, 'markdown', 'html', [], [
      function(tree, cb) {
        return cb(null, wiki.replaceWikiLinks(tree));
      }
    ], function(err, html) {
      q.ok(err == null, 'No error is raised in the pipeline');
      q.ok(html != null, 'Some HTML is returned');
      q.equal(html, '<p><a href="/pages/Test%20wikilink.md/view">Test wikilink</a></p>\n', 'Returned HTML is correct');
      return q.start();
    });
  });

  q.test('convertFile', function() {
    var text1;
    text1 = "* Metadata: `[[metadata]]`\n* Categories: `[[#category]]`\n* Replacements: `{{replacement}}`\n	* Transclusion: `{{>page}}`\n	* Templates: `{{template|option1|option2|named_option=value}}`\n	* Alternatively:";
    q.stop();
    return markup.convertFile(text1, 'markdown', 'docx', [], function(err, filename) {
      q.ok(err == null, 'No error on conversion');
      if (err) {
        console.log(err);
      }
      q.ok(filename, 'Temporary filename generated');
      return q.start();
    });
  });

}).call(this);
