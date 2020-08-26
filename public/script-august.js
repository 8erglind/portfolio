 $(document).ready(function(){
	var $draggable = $('.portfolio-item').draggabilly();


	$('p').each(function(i, item){
		var top = $(item).offset().top;
		console.log(top, i, item);

		$(this).css({
			top: top,
	
		});
	});

	$('p').css({
		position: 'absolute' 
	});

	$(".portfolio-item").on("click",function(){
		$(this).parent().append(this);
	});




    $(document).ready(function() {
   

    	console.log("zoom")

    	$("#a").zoomTo({targetsize:1, duration:600});

    	//$(".zoomTarget").zoomTo({targetsize:0.75, duration:600});

   	 	$(".menu").click(function(evt) {
    	console.log("zoom to")

        	$("#a").zoomTo({targetsize:.5, duration:600});
        	evt.stopPropagation();
    	});

    	$(".back").click(function(evt) {
        	$("#a").zoomTo({targetsize:2, duration:600});
        	evt.stopPropagation();
    	});
	});
});






