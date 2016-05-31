/* --------------------------------------------------------------- */
/* Date stuff: */
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var days   = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var today = new Date();
var year  = today.getFullYear(),
	month = months[today.getMonth()],
	date  = today.getDate(),
	day   = days[today.getDay()],
	hour = today.getHours(),
	mins = today.getMinutes(),
	raw  = Date.now();

var am_pm = hour > 12 ? 'pm': 'am';
var time_string = (hour % 12).toString() + ':' + mins.toString() + ' ' + am_pm;


/* --------------------------------------------------------------- */
/* dynamically correct height of #aggregate_meter */
var $control_panel = $('#control_panel'),
	$aggregate_meter = $('#aggregate_meter'),
	$window = $(window);

function update_aggregate_meter_height() {
	var cp_height = $control_panel.height();	
	$aggregate_meter.css('height','calc(100% - ' + cp_height.toString() + 'px)');
}
$window.on('resize', function() {
	update_aggregate_meter_height();	
});
update_aggregate_meter_height();



/* --------------------------------------------------------------- */
(function() {

	
	// --------------------
	// Memory Model
	var Memory_Model = Backbone.Model.extend({
		defaults: {

			'date_time': {
				'year': year,
				'month': month,
				'date': date,
				'day': day,
				'time': time_string,
				'raw': raw
			},
			'memory_text': null,
			'media': {
				'image': null,
				'video':null,
				'audio':null
			},
			'emotions': {
				'joy': {
					'value': null,
					'percentage': null
				},
				'sadness': {
					'value': null,
					'percentage': null
				},
				'anger': {
					'value': null,
					'percentage': null
				},
				'fear': {
					'value': null,
					'percentage': null
				},
				'disgust': {
					'value': null,
					'percentage': null
				},
				'neutral': {
					'value': null,
					'percentage': null
				}
			},
			'gradient': {
				'default': null,
				'webkit': null,
				'moz': null
			}
		},
		emotion_vals_to_percentages: function() {

			var emotions = this.attributes.emotions,
				total = 0;
			/* calculate total of emotion values */
			for(var emotion in emotions) {
				if (emotions[emotion].value)
					total += emotions[emotion].value;
			}
			/* assign percentage values to emotions using total */
			for (var emotion in emotions) {
				if (emotions[emotion].value)
					emotions[emotion].percentage = Math.floor( (emotions[emotion].value / total) * 100);
			}
		},
		percentages_to_gradient_string: function() {

			var current_percentage = 0,
				emotions = this.attributes.emotions,
				num_of_emotions = 0,
				i = 1, /* to act as index in the for in loop */
				str_value,
				gradient_str = 'linear-gradient(to bottom, '; /* partial css linear-gradient string */

			// determine number of emotions with values/percentages
			for ( var emotion in emotions ) 
				if (emotions[emotion].percentage) num_of_emotions++;

			// if only 1 emotion value, linear gradient is not used
			if (num_of_emotions === 1) {
				for (emotion in emotions)
					if (emotions[emotion].percentage) {
						this.attributes.gradient.default = emotion_translate(emotion, 'color');
						return;
					}
			}

			// build linear-gradient string
			for (emotion in emotions) {
				if (emotions[emotion].percentage) {
					if (i === num_of_emotions)
						str_value = ');'; /* this ends the css gradient_str */
					else {
						current_percentage += emotions[emotion].percentage;
						str_value = current_percentage + '%, ';
					}
					gradient_str += emotion_translate(emotion, 'color') + ' ' + str_value;
					i++;		
				}
			}
			this.attributes.gradient.default = gradient_str;
		}
	});



	// --------------------
	// Memories Collection (rename to hippocampus?)
	var Memory_Collection = Backbone.Collection.extend({
		model: Memory_Model,
		localStorage: new Backbone.LocalStorage('Memory_LocalStorage'),
		comparator: function(a, b) {
			return a.get('date_time')['raw'] < b.get('date_time')['raw'] ? -1 : 1;
		},
		greaterThan: function(value) {
			var filtered = this.filter(function(memory) {
				return memory.get('emotions')[value].percentage > 0;
			});
			return new Memory_Collection(filtered);
		}
	});
	var my_memory = new Memory_Collection();
	var superset = new Memory_Collection();
	my_memory.fetch();
	superset.fetch();





	// ---------------------
	// View for Control Panel
	var Control_Panel = Backbone.View.extend({
		el: $('#control_panel'),
		events: {
			'click #add_memory'      : 'add_memory',
			'change #sort_select'    : 'collection_sort',
			'change #filter_select'  : 'filter_by'
		},
		initialize: function() {
			this.render();
		},
		render: function() {
		},
		add_memory: function() {
			memory_add_modal.render();
		},
		collection_sort: function(e) {
			var val = $(e.currentTarget).val();
			if ( val === 'newest' || val === 'oldest' )
				memories.sort_by_date(val);
			else
				memories.sort_by_emotion(val);
		},
		filter_by: function(e) {
			var filter = $(e.currentTarget).val();
			memories.filter_by_emotion(filter);
		}	
	});
	var control_panel = new Control_Panel();




	// -------------------------
	// View for Add Memory Modal
	var Memory_Add_Modal = Backbone.View.extend({
		el: $('#add_memory_dialog'),
		events: {
			'click #modal_cancel'          : 'close',
			'click .modal_close'           : 'close',
			'click .input_attachment_icon' : 'toggle_attachment',
			'click #modal_reset'           : 'reset',
			'click #save_new_memory'       : 'save_memory',
			/*
			'click #add_audio_attachment'  : 'add_audio_attachment',
			'click #add_image_attachment'  : 'add_image_attachment',
			'click #add_video_attachment'  : 'add_video_attachment',	
			*/
			'click .add_attachment_url'	   : 'add_attachment',
			'keyup #input_memory'          : function() { 
												this.validate();
												this.new_memory.attributes.memory_text = $('#input_memory').val();
											 }
		},
		initialize: function() {
			var view = this;

			view.new_memory = null;
			view.initialize_new_memory();
			autosize($('#input_memory'));
			$('.emotion_slider').slider({
				//orientation: 'vertical',
				change: function(e, ui) {
					view.validate(e, ui);
					var el_id = $(e.target).attr('id');
					var prop = el_id.substring(el_id.indexOf('_') + 1, el_id.length);
					view.new_memory.attributes.emotions[prop]['value'] = ui.value;
				},
				range: 'min',
				value: 0,
				min: 0,
				max: 5,
			});
		},
		render: function() {
			this.$el.addClass('view');
			$('.input_attachment_icon').removeClass('active');
			$('#input_memory').focus();
		},
		render_model_data: function() {

			var memory = this.new_memory.attributes;

			$('#input_memory').val(memory.memory_text);

			// emotions:
			for (emotion in memory.emotions) {
				this.render_emotion_slider(emotion, memory.emotions[emotion]['value']);
			}

			// attachments:
			// display checkmark icon if attachment has been added for each type
			for (attachment in memory.media) {
				this.render_attachment_status(attachment, memory.media[attachment])
			}
		},
		render_emotion_slider: function(emotion_type, emotion_value) {
			$('#slider_' + emotion_type).slider('value', emotion_value);
		},
		render_attachment_status: function(attachment_type, attachment_value) {
			switch (attachment_type) {
				case 'audio':
					var $attch_icon = $('#attachment_button_audio > .attachment_check');
					attachment_value ? $attch_icon.removeClass('hide') : $attch_icon.addClass('hide');
					break;
				case 'image':
					var $attch_icon = $('#attachment_button_image > .attachment_check');
					attachment_value ? $attch_icon.removeClass('hide') : $attch_icon.addClass('hide');
					break;
				case 'video':
					var $attch_icon = $('#attachment_button_video > .attachment_check');
					attachment_value ? $attch_icon.removeClass('hide') : $attch_icon.addClass('hide');
					break;
			}
		},
		clear: function() {
			$('#input_memory').val('');
			$('.emotion_slider').slider('value', 0);
		},
		close: function() {
			this.$el.removeClass('view');
		},

		toggle_attachment: function(e) {
			var $icon = $(e.target).closest('.input_attachment_icon'),
				attachment_type = $icon.attr('data-attachment-type');
			
			$icon.toggleClass('active').siblings().removeClass('active');

			if ($icon.hasClass('active')) {
				this.toggle_attachment_input(attachment_type);
			} else {
				this.toggle_attachment_input(false);
			}
		},
		toggle_attachment_input: function(type) {
			var $input_div = $('.attachments_input[data-attachment-type="' + type + '"]');
			$('.attachments_input').addClass('hide');
			if (type) {
				
				switch (type) {
					case 'audio':
						$input_div.removeClass('hide');
						$('#audio_text_input').val(this.new_memory.attributes.media.audio);
						break;
					case 'image':
						$input_div.removeClass('hide');
						$('#image_text_input').val(this.new_memory.attributes.media.image);
						break;
					case 'video':
						$input_div.removeClass('hide');
						$('#video_text_input').val(this.new_memory.attributes.media.video);
						break;
					default:
						console.log('error - toggle_attachment_input');
						break;												
				}
			} else 
				$input_div.html('');
		},		
		validate: function(slide_event, slide_ui) {
			var view = this;

			// check for text input upon memory save
			if (! $('#input_memory').val() ) {
				//display_noty('warning', 'topCenter', 'Please enter a memory');
				view.handle_save_button('disable')
				return;
			}

			// check for emotion slider value(s) upon memory save
			var sliders_valid = false;
			this.$el.find('.emotion_slider').each(function(i, el) {
				if ( $(this).slider('value') > 0 ) {
					sliders_valid = true;
					return;
				}
			}).promise().done(function() {
				if (!sliders_valid) {
					//display_noty('warning', 'topCenter', 'Please enter an emotion value(s)');
					view.handle_save_button('disable');
					return;
				} else {
					view.handle_save_button('enable');
				}
			});

		},
		handle_save_button: function(action) {
			if (action === 'enable') {
				$('#save_new_memory').addClass('enabled');
			}
			else if (action === 'disable') {
				$('#save_new_memory').removeClass('enabled');
			}
		},

		add_attachment: function(e) {

			var type = $(e.target).attr('data-attachment-type');
			
			var input_val = $('#' + type + '_text_input').val();
			input_val = $.trim(input_val);
			if (input_val === '') {
				this.new_memory.attributes.media[type] = input_val;
				this.render_model_data();
				return;	
			}	
			if (this.validate_url(input_val)) {

				switch (type) {
					case 'audio':
						if (this.validate_audio_url(input_val)) {
							this.new_memory.attributes.media.audio = input_val;
							this.render_model_data();
							return;				
						} 
						else
							//alert ('Please enter on of the accepted audio/music based website urls:\nSoundcloud, Bandcamp, Youtube');
							display_noty('warning', 'topCenter', 'Please enter an accepted audio/music website url');
						break;
					case 'image':
						if (this.validate_image_url(input_val)) {
							this.new_memory.attributes.media.image = input_val;
							this.render_model_data();
							return;				
						} 
						else
							alert ('Please enter on of the accepted audio/music based website urls:\nSoundcloud, Bandcamp, Youtube');
						break;
					case 'video':
						if (this.validate_video_url(input_val)) {
							this.new_memory.attributes.media.video = input_val;
							this.render_model_data();
							return;				
						} 
						else
							alert ('Please enter on of the accepted audio/music based website urls:\nSoundcloud, Bandcamp, Youtube');
						break;										
				}
			} 
			else
				alert('Please enter a valid url\nex: https://google.com');	

			
		},
		add_image_attachment: function() {
			var $input_val = $('#image_text_input').val();
			this.new_memory.attributes.media.image = $input_val;
			this.render_model_data();
		},
		add_video_attachment: function() {
			var $input_val = $('#video_text_input').val();
			this.new_memory.attributes.media.video = $input_val;
			this.render_model_data();
		},
		validate_url: function(url) {
			return /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url);
		},
		validate_audio_url: function(url) {
			return /soundcloud|bandcamp|youtube|\.(mp3|wav|ogg)$/i.test(url);
		},
		validate_video_url: function(url) {
			return /youtube|vimeo|vine|\.(mp4|mov|mkv|avi|m4v)$/i.test(url);
		},
		validate_image_url: function(url) {
			return /imgur|\.(jpg|jpeg|gif|png)$/i.test(url);
		},		
		initialize_new_memory: function() {
			this.new_memory = new Memory_Model({
				'date': date,
				'memory_text': '',
				'media': {
					'image': '',
					'video':'',
					'audio':''
				},
				'emotions': {
					'joy': {
						'value': 0,
						'percentage': 0
					},
					'sadness': {
						'value': 0,
						'percentage': 0
					},
					'anger': {
						'value': 0,
						'percentage': 0
					},
					'fear': {
						'value': 0,
						'percentage': 0
					},
					'disgust': {
						'value': 0,
						'percentage': 0
					},
					'neutral': {
						'value': 0,
						'percentage': 0
					}
				},
				'gradient': {
					'default': '',
					'webkit': '',
					'moz': ''
				}
			});
		},		
		save_memory: function(e) {

			if ($(e.target).hasClass('enabled')) {
				this.new_memory.emotion_vals_to_percentages();
				this.new_memory.percentages_to_gradient_string();

				my_memory.add(this.new_memory);
				this.new_memory.save();
		
				this.close();
				this.clear();
			}
		},
		reset: function() {
			this.initialize_new_memory();
			this.render_model_data();
		}
	});
	var memory_add_modal = new Memory_Add_Modal();



	// ---------------------
	// View for Memory Display
	var Memory_Display = Backbone.View.extend({
		el: $('#memory_display'),
		events: {
			'click #memory-display-close'      : 'close_display',
			'click .memory-delete-text'        : 'toggle_confirm',
			'click .memory-delete-cancel'      : 'toggle_confirm',
			'click .memory-display-delete .fa' : 'delete_memory',
			'click .memory-toggle-audio'       : 'toggle_audio',
		},

		visible: false,

		initialize: function() {

			this.$media_text = $('.memory-media-text');

			/* Music/audio info */
			this.audio_player = document.getElementById('memory-audio-player');
			this.current_audio = {
				artist: '',
				track: '',
				uri: ''
			}

		},
		render: function(model) {
			var that = this;
			if (!this.visible) {
				this.$el.animate({
					top: '98px'
				}, 850, 'easeOutQuart', function() {
					that.visible = true;
					that.render_callback(model);
				});
			} else this.render_callback(model);
		},

		render_callback: function(model) {

			/* Reset state */
			/*
			this.set_audio_text(' ');
			this.reset_delete_confirm();
			$('.emotions-meter-segment').css('width', 0);	
			*/

			this.reset_memory_display_state();		

			this.current_memory = model;

			var emotions = model.attributes.emotions;
			for (var emotion in emotions) {
				/* render emotions segment meter */
				if (emotions[emotion]['percentage'])
					$('.segment-' + emotion).css('width', emotions[emotion]['percentage']+'%');
			}

			/* todo: refactor into above loop */
			$('.memory-display-controls > i').addClass('hide');
			var media = model.attributes.media;
			for (var media_type in media) {
				if (media[media_type]) {
					switch (media_type) {
						case 'audio':
							$('.memory-display-controls > .fa-music').removeClass('hide');
							break;
						case 'image':
							$('.memory-display-controls > .fa-picture-o').removeClass('hide');
							break;	
						case 'video':
							$('.memory-display-controls > .fa-video-camera').removeClass('hide');
							break;					
					}
				}
			}

			this.$el.find('.memory-display-day').text(model.attributes.date_time.day);
			this.$el.find('.memory-display-time').text(model.attributes.date_time.time);			
			this.$el.find('.memory-display-month').text(model.attributes.date_time.month);
			this.$el.find('.memory-display-date').text(model.attributes.date_time.date);
			this.$el.find('.memory-display-year').text(model.attributes.date_time.year);

			this.$el.find('.memory-display-text').text(model.attributes.memory_text);

			/* Auto-play/display media */
			this.load_audio(model);
			this.load_video(model);			
		},

		reset_memory_display_state: function() {
			/* Reset state */
			this.set_audio_text(' ');
			this.reset_delete_confirm();
			$('.emotions-meter-segment').css('width', 0);
			this.$el.find('.memory-video-container').html('');		
		},

		load_audio: function(model) {
			var that = this;
			var audio_url = model.attributes.media.audio;
			if (audio_url) {

				var get_url = 'http://api.soundcloud.com/resolve.json?url=' + audio_url + '&client_id=' + soundcloud_client_id;
				$.ajax({
					url: get_url,
					type: 'get',
					success: function(result) {
						var uri = result.uri + '/stream?client_id=' + soundcloud_client_id;

						that.current_audio.artist = result.user.username;
						that.current_audio.track = result.title;
						that.current_audio.uri = uri;

						$('#memory-audio-player').attr('src', uri);	
					},
					error: function(error) {
						console.log(error);
					}
				});
			}
		},
		play_audio: function() {
			this.audio_player.play();
		},
		toggle_audio: function() {
			if (this.audio_player.paused) {
				this.play_audio();
				this.set_audio_text(this.current_audio.artist + ' : ' + this.current_audio.track);
				// toggle music icon class to active
			} else {
				this.audio_player.pause();
				// toggle music icon class to inactive
			}
		},
		set_audio_text: function(text) {
			this.$media_text.text(text);
			//this.$media_text.text(this.current_audio.track);
		},

		load_video: function(model) {
			// determine domain
			//return /youtube|vimeo|vine|\.(mp4|mov|mkv|avi|m4v)$/i.test(url);

			var video_url = model.attributes.media.video;

			if ( /youtube/i.test(video_url) ) {
				var youtube_embed = video_url.replace(/watch\?v=/, 'embed/');
				var iframe_str = '<iframe class="youtube-iframe" width="560" height="315" src="' + youtube_embed + '" frameborder="0"></iframe>'; 
				this.$el.find('.memory-video-container').append(iframe_str);
			}


		},

		current_memory: '',
		close_display: function() {
			this.audio_player.pause();
			this.$el.animate({
				top: '-278px'
			}, 850, 'easeOutQuart', function() {
				$('.memory-active').removeClass('memory-active');
			});
		},
		toggle_confirm: function() {
			$('.memory-delete-text').toggleClass('visible');
			$('.delete-memory-icon').toggleClass('visible');
			$('.memory-delete-cancel').toggleClass('visible');
		},
		reset_delete_confirm: function() {
			$('.memory-delete-text').addClass('visible');
			$('.delete-memory-icon').removeClass('visible');
			$('.memory-delete-cancel').removeClass('visible');			
		},
		delete_memory: function(e) {
			this.toggle_confirm();
			this.current_memory.destroy();
			this.close_display();
		}
	});
	var memory_display_view = new Memory_Display();
	




	// --------------------------
	// View for individual memory
	var Memory_View = Backbone.View.extend({
		tagName: 'div',
		className: 'memory',
		events: {
			'click': 'view_memory',
		},
		template: _.template($('#memory_template').html()),
		render: function() {
			this.$el.html(this.template(this.model));
			this.$el.attr('style', 'background: ' + this.model.attributes.gradient.default.toString());
			return this;
		},
		remove_memory: function() {
			this.model.destroy();	// delete model
			this.remove();			// delete view
		},
		// Custom Events
		view_memory: function() {
			if (this.$el.hasClass('memory-active')) {
				memory_display_view.close_display();
			} else {
				$('.memory-active').removeClass('memory-active')
				this.$el.addClass('memory-active');
				memory_display_view.render(this.model);				
			}
		}
	}); 




	var $memory_display = $('#memory_display'),
		$memory_number  = $('#memories_num');
	// --------------------------
	// View for Memory Collection
	var Memories_View = Backbone.View.extend({
		el: $('#memory_container'),
		events: {
			'click .sort_by_emotion' : 'sort_by_emotion',
		},
		initialize: function() {

			this.collection = my_memory;
			this.render();

			this.collection.on('add', this.render, this);
			this.collection.on('remove', this.render, this);
		},

		render: function() {
			this.$el.html('');
			this.collection.each(function(memory) {
				var memory_view = new Memory_View({model: memory});
				this.$el.append(memory_view.render().el);
			}, this);
			$memory_number.text( this.$el.children('.memory').length );
			return this;
		},
		delete_collection: function() {
			this.collection.each(function(model) {
				model.destroy();
			});
			this.render();
		},

		sort_by_emotion: function(emotion) {
			this.collection.comparator = function(a, b) {
				return a.get('emotions')[emotion]['percentage'] < b.get('emotions')[emotion]['percentage'] ? -1 : 1;
			}
			this.collection.sort();
			this.render();
		},
		sort_by_date: function(direction) {
			if (direction === 'newest') {
				this.collection.comparator = function(a, b) {
					return a.get('date_time')['raw'] < b.get('date_time')['raw'] ? -1 : 1;
				}				
			} else if (direction === 'oldest') {
				this.collection.comparator = function(a, b) {
					return a.get('date_time')['raw'] > b.get('date_time')['raw'] ? -1 : 1;
				}		
			}

			this.collection.sort();
			this.render();
		},

		// triggered from control panel view
		filter_by_emotion: function(emotion) {

			this.collection.reset(superset.toJSON());
			if (emotion === 'all') {
				$('#memories_qty_label_prefix').text('');
				this.render();
				return;
			}
			var filtered = this.collection.filter(function(memory) {
				return (memory.get('emotions')[emotion]['value'] > 0);
			});
			$('#memories_qty_label_prefix').text( emotion_translate(emotion, 'adjective') );
			this.collection.reset(filtered);
			this.sort_by_emotion(emotion);
		},
		/* todo: filter by date - month/year/range/day of week */
	});
	var memories = new Memories_View(my_memory);





	/* --------------------------------------------------------------------------- */
	/* Extra Functions */

	// Sum all values (that are numbers) in an object
	function sum_obj_values(obj) {
		var sum = 0;
		for (var prop in obj) {
			if (obj.hasOwnProperty(prop))
				sum += obj[prop];
		}
		return sum;
	}



	function emotion_translate(emotion, flag) {
		/* 
			emotion => flag
			flags:
			'color' returns corresponding hex value
			'adjective' returns corresponding adjective
		*/
		switch (emotion) {
			case 'joy':
				return flag === 'color' ? '#F5F317' : 'happy';
				break;
			case 'sadness':
				return flag === 'color' ? '#5380be' : 'sad';
				break;
			case 'anger':
				return flag === 'color' ? '#db373e' : 'angry';
				break;
			case 'fear':
				return flag === 'color' ? '#c3648e' : 'scary';
				break;
			case 'disgust':
				return flag === 'color' ? '#73c557' : 'disgusting';
				break;
			case 'neutral':
				return flag === 'color' ? '#ddd' : 'neutral';
				break;																		
		}		
	}



	/* Utility Functions */
	function display_noty(type, location, msg) {
		var n = noty({
			type: type,
			layout: location,
			text: msg,
			timeout: 2000,
			modal: false,
			maxVisible: 5,
			closeWith: ['click']
		});
	}
	/*
		types: alert, success, error, warning, information, confirm
		layouts: top, topLeft, topCenter, topRight, centerLeft, center, centerRight, bottomLeft, bottomCenter, bottomRight, bottom
	*/

})();

