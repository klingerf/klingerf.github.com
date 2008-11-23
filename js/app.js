var _3n = {}
get_user_names()

var Cell = new Class({
	Implements: Options,
	options: {
		main_class    : 'single-wide',
		custom_class	: '',
		title 				: '',
		created_on		: new Date(1985,5,31),
		source				: '#'
	},
	initialize: function(html, options){
		this.setOptions(options)
		this.html = html
		
		this.update_element()
		
		this.setup_tip()
		this.add_events()
		
		return this
	},
	
	create_element: function(){
		this.element = this.element || new Element('div')
		this.element.addClass('cell')
								.addClass(this.options.main_class)
								.addClass(this.options.custom_class)
								.addClass((coin_toss(0.1) ? 'inverted' : ''))
		
		if 			($type(this.html) === 'element') this.element.adopt(this.html)
		else if ($type(this.html) === 'string')  this.element.set('html', this.html)

		this.element.store('source',  this.options.source)
		this.element.store('title',   this.options.title)
		this.element.store('created', this.options.created_on.timeDiffInWords())

		return this.element
	},
	
	update_element: function(){
		this.element = this.create_element()
		return this
	},
	
	setup_tip: function(){
	  Cell.tip = Cell.tip || new JustTheTip(null, {
    	showDelay  : 400,
    	x_location : 'left',
    	y_location : 'bottom',
    	fade_in_duration  : 100,
    	fade_out_duration : 200
    }).addEvent('tipShown', function(tip,elem){
        tip.set('html', "<a class='title' href='" + elem.retrieve('source') + "'>" + elem.retrieve('title') + "</a><span class='date'>" + elem.retrieve('created') + "</span>")
      })
	},
	
	add_events: function(){
		if (this.options.source.length > 4) this.element.act_like_link(this.options.source)
		Cell.tip.add_element(this.element)
	},
	
	to_html: function(){
		return this.element
	}
})
Cell.tip = null

var ImageCell = new Class({
	Extends: Cell,
	initialize: function(src, options){
		this.setOptions(options)
		
		var elem = new Element('img', {
			'src' 	: src,
			'styles': { 'display':'none'	}
		})
		
		return this.parent(elem, options)
	},
	
	to_html: function(){
		this.html.on_has_width(function(){ 
			this.setStyle('display','block').thumbnail(140,140)
		}.bind(this.html))
		
		return this.parent()
	}
})


var Model = new Class({
	Implements: Events,
	initialize: function(){
		this.db = []
		
		this.title_elem = new Element('div', {
			'class' : 'cell single-wide grid-title ' + this.site_name, 
			'html'  : this.nombre
		}).act_like_link(this.web_source)
		
		return this
	},
	
	get_data: function(){
		new JsonP(
			this.json_url, 
			$merge(	{abortAfter : 1500, onComplete : this.process_data.bind(this) }, this.json_opts) 
		).request()
	},
	
	to_cells: function(){		
		return [this.title_elem].combine(this.db.map(function(row){ return this._to_cell.apply(row).to_html() }.bind(this)))
	}
})

var Flickr = new Class({
	Extends: Model,
	
	site_name  : "flickr",
	nombre     : "SEEING",
	json_url   : "http://api.flickr.com/services/feeds/photos_public.gne",
	web_source : "http://www.flickr.com/photos/" + (_3n.global_user || _3n.flickr_name),
	json_opts  : { globalFunction : 'jsonFlickrFeed',
								 data: { id     : _3n.flickr_user,
												 lang   : "en-us",
									       format : 'json' } },
	
	initialize: function(){		
		return this.parent()
	},
	
	process_data: function(json){
		this.db = json.items.map(function(json_item){
			return {
				title       : json_item.title,
				created_on  : Date.parse(json_item.date_taken),
				img_url     : json_item.media.m,
				source      : json_item.link,
				description : json_item.description,
				tags        : json_item.tags
			}
	  })
	
		this.fireEvent('dataReady', this)		
		return this.db
	},
	
	_to_cell: function(){
		return new ImageCell(this.img_url, { 
			'title' 		: this.title, 
			'created_on': this.created_on,
			'source' 		: this.source
		})
	}
})

var Twitter = new Class({
	Extends: Model,
	
	site_name  : "twitter",
	nombre     : "SAYING",
	json_url   : "http://search.twitter.com/search.json",
	web_source : "http://www.twitter.com/" + (_3n.global_user || _3n.twitter_user),
	json_opts  : { data: { q : "from:" + (_3n.global_user || _3n.twitter_user) } },
  
  initialize: function(){
		return this.parent()
  },

	process_data: function(json){
		this.db = json.results.map(function(json_item){
			return {
				title       : json_item.text,
				created_on  : Date.parse(json_item.created_at),
				source      : "http://www.twitter.com/" + json_item.from_user + "/status/" + json_item.id,
				html        : json_item.text.make_urls_links().link_replies().link_hashcodes()
			}
	  })
	
		this.fireEvent('dataReady', this)		
		return this.db
	},					
	
	_to_cell: function(){
		return new Cell(this.html, { 
			'main_class'	 : (this.title.length > 90) ? 'double-wide' : 'single-wide',
			'custom_class' : 'text tweet ',
			'created_on'	 : this.created_on,
			'source'			 : this.source
		})
	}	
})

var LastFM = new Class({
	Extends: Model,
	
	site_name  : "lastfm",
	nombre     : "HEARING",
	json_url   : "http://lastfm-api-ext.appspot.com/2.0/",
	web_source : "http://www.last.fm/user/" + (_3n.global_user || _3n.lastfm_user),
	json_opts  : { data : { method  : 'user.getRecentTracks',
	 												user    : _3n.global_user || _3n.lastfm_user,
													api_key : 'b25b959554ed76058ac220b7b2e0a026',
													limit   : 100,
													outtype : 'js' } },
													
  initialize: function(){
		return this.parent()
  },

	process_data: function(json){
		this.db = json.recenttracks.map(function(json_item){
			return {
				track       : json_item.name,
				track_url   : json_item.url,
				artist      : json_item.artist.name,
				html        : "<span class='artist'>" + json_item.artist.name + "</span> <a class='track' href='" + json_item.url + "'>" + json_item.name + "</span>",
				created_on  : Date.parse(json_item.date.text).decrement('hour',8)
			}
	  })

		this.fireEvent('dataReady', this)		
		return this.db
	},					

	_to_cell: function(){
		return new Cell(this.html, { 
			'custom_class' : 'text lastfm-song',
			'created_on'	 : this.created_on
		})
	},
	
	to_cells: function(){		
		var tmp = []
		
		for (var i=0; i < this.db.length; i++){
			if (i > 0 && this.db[i-1].artist === this.db[i].artist ){
				if (prev_cell) {
					prev_cell.html += "<span class='track'>, " + this.db[i].track + "</span>"
					prev_cell.options.main_class = 'double-wide'
					prev_cell.update_element()
				}
			} else {
				var prev_cell = this._to_cell.apply(this.db[i])
				tmp.push(prev_cell)
			}
		}
		
		return [this.title_elem].combine(tmp.map(function(t){ return t.to_html() }))
	}

})


var LastFMGrid = new Class({
  Extends: Model,
  initialize: function(data){
    return this.parent(data)
  },
  
  view: function(data){
		var tmp = []
		var data = data.recenttracks
		
		for (var i=0; i < data.length; i++){
			var artist = data[i].artist.name
			var track  = data[i].name
			var html   = "<span class='artist'>" + artist + "</span> <a class='track' href='" + data[i].url + "'>" + track + "</span>"

			if (i > 0 && data[i-1].artist.name === artist ){
				if (prev_cell) {
					prev_cell.html += "<span class='track'>, " + track + "</span>"
					prev_cell.options.main_class = 'double-wide'
					prev_cell.update_element()
				}
			} else {
				var prev_cell = new Cell(html, {
					'custom_class' : 'text lastfm-song',
					'created_on'	 : Date.parse(data[i].date.text).decrement('hour',8)
				})
				tmp.push(prev_cell)
			}
		}
		
		return tmp
  }
})

var DeliciousGrid = new Class({
	Extends: Model,
	initialize: function(data){
		return this.parent(data)
	},
	
	view: function(data){
		return data.map(function(bookmark,i){
			var html = new Element('a', {html:bookmark.d, href:bookmark.u})
			
			if (bookmark.u.test(/png|gif|jpg|jpeg|bmp|svg/i)) { // todo put in brawndo
			  return new ImageCell(bookmark.u, {
			    'title'        : bookmark.d,
  				'created_on'	 : Date.parse(bookmark.dt),
  				'source'			 : bookmark.u
  			})
			} else {
			 	return new Cell(html, {
  				'main_class'	 : (bookmark.d.length > 90) ? 'double-wide' : 'single-wide',
  				'custom_class' : 'delicious ' + (i==0 ? 'first' : ''),
  				'created_on'	 : Date.parse(bookmark.dt),
  				'source'			 : bookmark.u
  			}) 
			}
		})
	}
})



var Controller = new Class({
	Implements: Options,
	options : {
		limit : 100,
		jsonp_opts : {},
		bucket : 0
	},
	initialize: function(url, nombre, link_href, model, options){
		this.setOptions(options)
		
		this.url        = url
		this.nombre     = nombre
		this.link_href  = link_href
		this.model      = model
		
		// this.title_elem = new Element('div', {
		// 	'class' : 'cell single-wide grid-title ' + this.options.site_name, 
		// 	'html'  : this.nombre
		// }).act_like_link(this.link_href)
		
		// this.jsonp_opts.onComplete = this.options.jsonp_opts.onComplete || function(r){
			// this.grid = new model(r)
			// $('main').adopt( this.title_elem, this.grid.to_html(this.options.limit) )
		// }.bind(this)
		
		this.get_data()
		
		return this
	},
	
	get_data: function(oc){
		new JsonP(this.url, $merge({abortAfter:1500,onComplete:oc},this.options.jsonp_opts)).request()
	}
})

var Delicious = new Class({
	Extends: Controller,
	initialize: function(tag){
		var url = "http://feeds.delicious.com/v2/json/" + (_3n.global_user || _3n.delicious_user) + "/" + tag
		var nombre = tag.toUpperCase()
    var href   = "http://www.delicious.com/" + (_3n.global_user || _3n.delicious_user) + "/" + tag
		
		return this.parent(url, nombre, href, DeliciousGrid, { jsonp_opts:{data: { count: 20 }},limit : 9, site_name : 'delicious' })
	}
})

function get_user_names(){
	[['global_user',null],['twitter_user','3n'],['flickr_user','52179512@N00'],['flickr_name','3n'],['delicious_user','3n'],['lastfm_user','3n'],['delicious_tags','humor+awesome']].each(function(u){
		_3n[u[0]] = params()[u[0]] || u[1]
	})
}

function goog(){    
  var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
  new Element('script', {'src':gaJsHost + 'google-analytics.com/ga.js', 'type':'text/javascript'}).inject(document.body, 'bottom')
  try {
    var pageTracker = _gat._getTracker("UA-6319958-1");
    pageTracker._trackPageview();
  } catch(err) {}    
}

function they_spinnin(){
	$('main').addEvent('click', function(e){ 
		if (e.target.id !== 'main') return;
		this.rotate(this.get_transform_int() + 180,{
			duration   : 3000,
			transition : 'ease-in-out'
		}); 
	}) 
	$('title').addEvent('click', function(){ 
		this.rotate(1440,{
			duration   : 2000,
			onComplete : this.rotate.bind(this, [0.01,{duration:0.01}]),
			transition : 'cubic-bezier(0.3,0.1,0.1,1)'
		}) 
	})
	window.addEvent('keyup', function(e){
		if (e.key == 'g'){
			var sex = new Element('div', {'styles':{'float':'left','border':'10px solid red'}}).adopt(
				new Element('iframe', {'src':'http://www.google.com', 'width':'500px', 'height':'500px'})
			).inject(document.body,'top')	
			sex.addEvent('click', sex.rotate.bind(sex, [360,{
				duration   : 2000, 
				onComplete : sex.rotate.bind(sex,[0.01,{duration:0.01}])
			}]))
		}else
		if (e.key == 'b'){
			$$('body').rotate(1440,{
				duration   : 2000, 
				onComplete : $$('body').rotate.bind($$('body'), [0.01,{duration:0.01}]),
				transition : 'cubic-bezier(0.3,0.1,0,1)'
			}) 
		}
	})
}

window.addEvent('domready', function(){

  document.body.set('html', '<div id="wrapper"><h1 id="title">3N</h1><div id="main"></div></div>')

	they_spinnin()

	if (navigator.userAgent.match('iPhone')) document.body.addClass('iphone')
	
	new Flickr()
		.addEvent('dataReady', function(f){ $('main').adopt( f.to_cells()) })
		.get_data()
		
	new Twitter()
		.addEvent('dataReady', function(f){ $('main').adopt( f.to_cells()) })
		.get_data()	
	
	new LastFM()
		.addEvent('dataReady', function(f){ $('main').adopt( f.to_cells()) })
		.get_data()			
	
	// new App([
	// 
	// 	new Controller (
	// 		"http://api.flickr.com/services/feeds/photos_public.gne", 
	// 		"SEEING",
	// 		"http://www.flickr.com/photos/" + (_3n.global_user || _3n.flickr_name),
	// 		FlickrGrid, {
	// 			jsonp_opts : {
	// 				globalFunction : 'jsonFlickrFeed',
	// 				data: {
	// 					id 	 	 : _3n.global_user || _3n.flickr_user,
	// 					lang 	 : "en-us",
	// 					format : 'json'
	// 				}
	// 			},
	// 			limit     : 14, 
	// 			site_name : 'flickr'
	// 		}
	// 	),
	// 
	// 	new Controller (
	// 		"http://search.twitter.com/search.json", 
	// 		"SAYING",
	// 		"http://www.twitter.com/" + (_3n.global_user || _3n.twitter_user),
	// 		TwitterGrid, {
	// 			jsonp_opts : { 
	// 				data: {
	// 					q : "from:" + (_3n.global_user || _3n.twitter_user)
	// 				}
	// 			},
	// 			limit      : 19, 
	// 			site_name  : 'twitter'
	// 		}
	// 	),
	// 
	// 	_3n.delicious_tags.split('+').map(function(tag){
	// 		new Delicious(tag)
	// 	}),
	// 
	// 	new Controller (
	// 		"http://lastfm-api-ext.appspot.com/2.0/",
	// 	  "HEARING",
	// 	  "http://www.last.fm/user/3N",
	// 	  LastFMGrid, {
	// 			jsonp_opts:{ 
	// 				data: {
	// 					method  : 'user.getRecentTracks',
	// 					user    : _3n.global_user || _3n.lastfm_user,
	// 					api_key : 'b25b959554ed76058ac220b7b2e0a026',
	// 					limit   : 100,
	// 					outtype : 'js'
	// 				} 
	// 			},
	// 			limit     : 9, 
	// 			site_name : 'lastfm' 
	// 		}
	// 	)
	// 	
	// ], $('main'))	
	
  if ( !document.location.href.match(/~ian/) ) goog()
	
}) 

