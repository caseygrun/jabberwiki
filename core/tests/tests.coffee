util = require('util')

# if not QUnit? then QUnit = require('qunit-cli')
q = QUnit

# q.module('grammar');
# grammar = require('./grammar')

# q.test('grammar', ->
# 	console.log grammar.parse('hello {{world}}')
# )


q.module('wiki')
wiki = require('../wiki')

q.test 'tempFile', ->
	q.stop()
	wiki.tempFile (err,filename) ->
		q.ok(filename,'Temporary filename is generated')
		q.start()

q.test 'url', ->
	q.equal wiki.url('testPage'), '/pages/testPage.md/view', 'Simple File'
	q.equal wiki.url('testPage/'), '/pages/testPage//view', 'Simple Folder'
	q.equal wiki.url('/testPage/'), '/pages/testPage//view', 'Simple Folder'

q.test 'filename', ->
	q.equal wiki.filename('test'), 'test.md', 'Simple file'
	q.equal wiki.filename('test/'), 'test/', 'Simple folder'
	q.equal wiki.filename('/test/'), 'test/', 'Simple folder'
	q.equal wiki.filename('testDir/testFile'), 'testDir/testFile.md', 'File in folder'

q.test 'routeToRegExp', ->
	route1 = wiki.routeToRegExp('/pages/[page]/view');
	test1a = '/pages/page1/view'
	test1b = '/pages/folder1/folder2/page2/view'
	q.ok(route1.test(test1a))
	q.deepEqual test1a.match(route1),[test1a, 'page1']
	q.deepEqual test1b.match(route1),[test1b, 'folder1/folder2/page2']

	route2 = wiki.routeToRegExp('/pages/[page]/diff/{v1}/{v2}');
	test2 = '/pages/Classes/ES-230.md/diff/ac632a2078121fa592dbb547e363c833856508d0/current'

	q.deepEqual test2.match(route2),[test2, 'Classes/ES-230.md', 'ac632a2078121fa592dbb547e363c833856508d0', 'current' ]


q.test 'replaceWikiLinks', ->
	testDoc1 = [{
			"docTitle": [],
			"docAuthors": [],
			"docDate": []
		},[{
			"Link": [
				[{
					"Str": "Front"
				}, "Space", {
					"Str": "Page"
				}],
				["", ""]
			]
		}]]
	testDoc1_expect = [{
			"docTitle": [],
			"docAuthors": [],
			"docDate": []
		},[{
			"Link": [
				[{
					"Str": "Front"
				}, "Space", {
					"Str": "Page"
				}],
				["/pages/Front%20Page.md/view", ""]
			]
		}]]

	testDoc1_res = wiki.replaceWikiLinks(testDoc1);
	q.deepEqual(testDoc1_res,testDoc1_expect,'Simple document behaves properly')


q.test 'replaceImages', () ->

	testDoc1 = [{
			"docTitle": [],
			"docAuthors": [],
			"docDate": []
		},
		[{
			"Para": [{
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
			}]
		}, {
			"Para": [{
				"Image": [
					[{
						"Str": "Some"
					}, "Space", {
						"Str": "image"
					}, "Space", {
						"Str": "goes"
					}, "Space", {
						"Str": "here"
					}],
					["http://upload.wikimedia.org/wikipedia/commons/thumb/2/26/YellowLabradorLooking_new.jpg/260px-YellowLabradorLooking_new.jpg", "fig:"]
				]
			}]
		}]
	]

	testDoc1_expect = testDoc1
	testDoc1_res = wiki.replaceWikiLinks(testDoc1);
	q.deepEqual(testDoc1_res,testDoc1_expect,'Image with fully qualified URI is unchanged')

	# ------------------------------------------------------------------------


	testDoc2 = [{
			"docTitle": [],
			"docAuthors": [],
			"docDate": []
		},
		[{
			"Para": [{
				"Image": [
					[{
						"Str": "Some"
					}, "Space", {
						"Str": "image"
					}, "Space", {
						"Str": "goes"
					}, "Space", {
						"Str": "here"
					}],
					["260px-YellowLabradorLooking_new.jpg", "fig:"]
				]
			}]
		}]
	]

	testDoc2_expect = [{
			"docTitle": [],
			"docAuthors": [],
			"docDate": []
		},
		[{
			"Para": [{
				"Image": [
					[{
						"Str": "Some"
					}, "Space", {
						"Str": "image"
					}, "Space", {
						"Str": "goes"
					}, "Space", {
						"Str": "here"
					}],
					["/files/260px-YellowLabradorLooking_new.jpg", "fig:"]
				]
			}]
		}]
	]

	testDoc2_res = wiki.replaceWikiLinks(testDoc2);
	q.deepEqual(testDoc2_res,testDoc2_expect,'Image without fully qualified URI is changed to include a file path')

q.test 'replaceImagesWithLocals', () ->
	q.ok true
	
