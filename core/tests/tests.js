(function() {
  var QUnit, q, util, wiki;

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

  q.test('url', function() {
    q.equal(wiki.url('testPage'), '/pages/testPage.md/view', 'Simple File');
    q.equal(wiki.url('testPage/'), '/pages/testPage//view', 'Simple Folder');
    return q.equal(wiki.url('/testPage/'), '/pages/testPage//view', 'Simple Folder');
  });

  q.test('filename', function() {
    q.equal(wiki.filename('test'), 'test.md', 'Simple file');
    q.equal(wiki.filename('test/'), 'test/', 'Simple folder');
    q.equal(wiki.filename('/test/'), 'test/', 'Simple folder');
    return q.equal(wiki.filename('testDir/testFile'), 'testDir/testFile.md', 'File in folder');
  });

  q.test('routeToRegExp', function() {
    var route1, test1;
    route1 = wiki.routeToRegExp('/pages/[page]/view');
    test1 = '/pages/page1/view';
    q.ok(route1.test(test1));
    return q.deepEqual(test1.match(route1), [test1, 'page1']);
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

  q.test('replaceImagesWithLocals', function() {});

}).call(this);
