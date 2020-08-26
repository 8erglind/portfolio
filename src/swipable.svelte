<script>
	import { tweened } from 'svelte/motion'
	import { cubicOut } from 'svelte/easing';
	import { onMount, tick } from 'svelte';

	export let current
	export let direction = 'horizontal'
	export let numStates = 2
	export let speed = 1

	let el

	let dragging = false
	let lastPosition
	let draggedPixels = 0
	let draggedBack
	let jumpEnabled = true
	let clientHeight
	let clientWidth

	export const progress = tweened(0, {
		duration: 400,
		easing: cubicOut
	})

	$: $progress = (draggedPixels / size) || 0
	$: current = Math.floor($progress + 0.5)
	$: positionField = direction == 'vertical' ? 'pageY' : 'pageX'
	$: maxSlideIndex = numStates - 1
	$: size = direction == 'vertical' ? clientHeight : clientWidth

	function startMove(startPosition) {
		dragging = true
		lastPosition = startPosition;
	}

	export function jump(index) {
		if (!jumpEnabled) return
		draggedPixels = index * size
	}

	function nextSlide() {
		if (dragging) return
		draggedPixels += size
		if (draggedPixels < maxSlideIndex * size) draggedPixels = 0
		nextSlideTimeout = setTimeout(nextSlide, 10000)
	}

	let nextSlideTimeout
	onMount(function() {
		// draggedPixels = initial * size
		// nextSlideTimeout = setTimeout(nextSlide, 10000)
	})

	function move(position) {
		if (!dragging) return
		let delta = position - lastPosition
		
		lastPosition = position
		draggedPixels -= delta * speed
		if (draggedPixels < 0) draggedPixels = 0
		if (draggedPixels > maxSlideIndex * size) draggedPixels = maxSlideIndex * size
		draggedBack = delta < 0
		jumpEnabled = false
	}

	function stopMove() {
		if (draggedBack) draggedPixels = Math.ceil(draggedPixels / size) * size
		else draggedPixels = Math.floor(draggedPixels / size) * size
		dragging = false
		stopTimeout = null
		clearTimeout(stopTimeout)

		// when release the mouse, the click event gets fired, calling the jump function, undoing the drag.
		// disable jump for one tick.
		setTimeout((() => jumpEnabled = true), 10)
		

		// clearTimeout(nextSlideTimeout)
		// nextSlideTimeout = setTimeout(nextSlide, 10000)
	}

	function mousedown(e) {
		// e.preventDefault()
		startMove(e[positionField])
	}

	function mouseup(e) {

		stopMove()
	}

	function mousemove(e) {
		if (stopTimeout) return // we just used the wheel
		move(e[positionField])
	}

	function touchstart(e) {
		// e.preventDefault()
		startMove(e.changedTouches[0][positionField])
	}

	function touchend(e) {
		stopMove()
	}

	function touchmove(e) {	
		e.preventDefault()
		move(e.changedTouches[0][positionField])
	}
		
		let stopTimeout
		function wheel(e) {
			e.preventDefault()
			startMove(0)
			move(direction == 'vertical' ? -e.deltaY : -e.deltaX)
			clearTimeout(stopTimeout)
			stopTimeout = setTimeout(stopMove, 100)
		}

</script>

<div bind:clientWidth 
		 bind:clientHeight 
		 on:touchstart={touchstart} 
		 on:touchmove={touchmove} 
		 on:touchend={touchend} 
		 on:mousedown={mousedown} 
		 on:mousemove={mousemove} 
		 on:mouseup={mouseup} 
		 on:wheel={wheel}
		 bind:this={el} 
		 class="swipeable">
	<slot {current} {jump} progress={$progress}></slot>
</div>

<style>
	.swipeable {
		width: 100%;
		height: 100%;
	}
</style>