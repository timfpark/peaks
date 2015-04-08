var async = require('async')
  , fs = require('fs')
  , request = require('request')
  , cheerio = require('cheerio');

var MIN_SEGMENT_ID = 229781;
var MAX_SEGMENT_ID = 8000000;
var WAIT_TIME_MS = 1000;

var parseSegment = function(segmentId, callback) {
	var segmentStreamUrl = 'http://www.strava.com/stream/segments/' + segmentId;
	console.log('fetching json: ' + segmentStreamUrl);

	request(segmentStreamUrl, function(err, response, json) {
		if (err) {
			console.log(err);
			return callback('stream fetch failed');
		}

		try {
			console.log('parsing json');
			var routeData = JSON.parse(json);
		} catch(e) {
			return callback(null, {
				id: segmentId,
				exists: false
			})
		}

		var segmentHtmlUrl = 'http://www.strava.com/segments/' + segmentId;
		console.log('fetching html: ' + segmentHtmlUrl);

		request(segmentHtmlUrl, function(err, response, html) {
			if (err) {
				console.log(err);
				return callback('html fetch failed');
			}

			var $ = cheerio.load(html);

			var segment = {
				id: segmentId,
				exists: true,
				type: $('.location').children().first().text(),
				name: $('.name').children().first().children().last().text(),
				distance: $('.distance').children().first().text(),
				lowestElevation: $('.elevation').children().first().text(),
				highestElevation: $('.highest-elev').children().first().text(),
				elevationChange: $('.elevation').next().next().children().first().text(),
				attempts: $(".inline-stats").children().last().children().last().text().trim(),

				latlng: routeData.latlng
			}

			return callback(null, segment);
		});
	});
};

async.forever(
	function(next) {
		console.log('waiting');
		setTimeout(function() {
			var segmentId;
			do {
				segmentId = Math.floor(Math.random() * (MAX_SEGMENT_ID - MIN_SEGMENT_ID) + MIN_SEGMENT_ID);
				console.log('checking ' + segmentId);
			} while (fs.existsSync('segments/' + segmentId));

			console.log('parsing ' + segmentId);

			parseSegment(segmentId, function(err, segment) {
				if (err) return console.log('error: ' + err);

				fs.writeFile('segments/' + segmentId, JSON.stringify(segment), function(err) {
					next();
				});

				if (segment.exists)
					console.log(segment.id + ": " + segment.name + ": " + segment.latlng.length + ": " + segment.attempts);
				else
					console.log(segment.id + ": nonexistant");
			});
		}, WAIT_TIME_MS * Math.random());
	},

	function(err) { }
);
