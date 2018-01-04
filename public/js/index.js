$(document).on('ready', function() {	
	var $size = $('#size'),
	    $bingo_count_type = $('#bingo_count_type'),
		$bingo_count = $("#bingo_count");
	function validateNumber() {
		var size = $size.val(),
		    type = $bingo_count_type.val();
			
		for(var i = 0; i < 25; i++) {
			$(".option" + (i+1)).show();
		}
			
		var max = 0;
		if(size == "3" && type == "bingo")
			max = 8;
		if(size == "3" && type == "card")
			max = 9;
		if(size == "5" && type == "bingo")
			max = 12;
		if(size == "5" && type == "card")
			max = 25;
			
		for(var i = max; i < 25; i++) {
			$(".option" + (i+1)).hide();
		}
		
		$bingo_count.val("1");
	}		
	
	$size.on('change', validateNumber);
	$bingo_count_type.on('change', validateNumber);
	
	validateNumber();
	
	$('#generate').on('click', function() {
		var payload = {}
		$('input.session').each(function() {
			payload[$(this).attr('id')] = $(this).is(':checked');
		});	
		
		$('.session').each(function() {
			if(!($(this).attr('id') in payload))
				payload[$(this).attr('id')] = $(this).val();
		});	
		window.location = "session?" + $.param(payload) 
	});
});