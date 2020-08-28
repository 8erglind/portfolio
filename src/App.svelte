<script>

	//  specifics  //
	import Onourowntime from './specifics/Onourowntime.svelte';
	import Green from './specifics/Green.svelte';
	import Vivienne from './specifics/Vivienne.svelte';
	import Portfolioio from './specifics/Portfolioio.svelte';
	import Typoposters from './specifics/Typoposters.svelte';
	import Secret from './specifics/Secret.svelte';
	import SortedPlastic from './specifics/sorted-plastic.svelte';
	import MusicPosters from './specifics/musicposters.svelte';
	import Timatal from './specifics/Timatal.svelte';
	import ToolsOfExpression from './specifics/ToolsOfExpression.svelte';
	import Trash from './specifics/Trash.svelte';
	import MusicBook from './specifics/MusicBook.svelte';
	import Corrupted from './specifics/Corrupted.svelte';
	import OilBuddies from './specifics/OilBuddies.svelte';
	import Litabok from './specifics/Litabok.svelte';
	import Plastica from './specifics/Plastica.svelte';
	import FamiliarFaces from './specifics/FamiliarFaces.svelte';
	import Likamar from './specifics/Likamar.svelte';
	import Oeb from './specifics/Oeb.svelte';
	import Beauimg from './specifics/beauimg.svelte';
	import Bread from './specifics/Bread.svelte';
	import Flora from './specifics/Flora.svelte';
	import Breadmag from './specifics/Breadmag.svelte';
  import Evublad from './specifics/Evublad.svelte';



	let expand;
	let frontscreen = true;
	let other = true;

	
	let onourowntime = false;
	let green = false;
	let viv = false;
	let typoposters = false;
	let secret = false;
	let portfolioio = false;
	let sortedplastic = false;
	let musicposters = false;
	let timatal = false;
	let tools = false;
	let trash = false;
	let musicbook = false;
	let corruptedspace = false;
	let oilbuddies = false;
	let litabok = false;
	let plastica = false;
	let familiarfaces = false;
	let likamar = false;
	let oeb = false;
	let beauimg = false;
	let bread = false;
	let flora = false;
	let breadmag = false;
  let evublad = false;
	



	//let distanceBLines = 'calc((95vh - 1px) / 9 * 1)';
	//let marginSides = 'calc(100vw / 16)';

	
	//let Main = false;

	//const toggleHide = () => {
	//	scrollToFront = false;
	//	Main = true;
	//}

	//const toggleother = () => { other = true;}
  const toggleonourowntime = () => { frontscreen = false; onourowntime = true; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglegreen = () => { frontscreen = false; onourowntime = false; green = true; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const toggleviv = () => { frontscreen = false; onourowntime = false; green = false; viv = true; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const toggleportfolioio = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = true; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const toggletypoposters = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = true; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglesecret = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = true; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglesortedplastic = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = true; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglemusicposters = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = true; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const toggletimatal = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = true; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const toggletools = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = true; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const toggleplastica = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = true; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglemusicbook = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = true; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglecorruptedspace = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = true; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const toggleoilbuddies = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = true; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglefamiliarfaces = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; litabok = false; plastica = false; familiarfaces = true; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglelitabok = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = true; trash = false; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const toggletrash = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = true; likamar = false; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglelikamar = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = true; oeb = false; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const toggleoeb = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = true; beauimg = false;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglebeauimg = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = true;  bread = false; flora = false; breadmag = false; evublad = false;}
	const togglebread = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false; bread = true; flora = false; breadmag = false; evublad = false;}
	const toggleflora = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false; bread = false; flora = true; breadmag = false; evublad = false;}
	const togglebreadmag = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false; bread = false; flora = false; breadmag = true; evublad = false;}
  const toggleevublad = () => { frontscreen = false; onourowntime = false; green = false; viv = false; portfolioio = false; typoposters = false; secret = false; sortedplastic = false; musicposters = false; timatal = false; tools = false; musicbook = false; corruptedspace = false; oilbuddies = false; plastica = false; familiarfaces = false; litabok = false; trash = false; likamar = false; oeb = false; beauimg = false; bread = false; flora = false; breadmag = false; evublad = true;}




  let PIConourowntime = true;
  let PICgreen = true;
  let PICviv = true;
  let PICtypoposters = true;
  let PICsecret = true;
  let PICportfolioio = true;
  let PICsortedplastic = true;
  let PICmusicposters = true;
  let PICtimatal = true;
  let PICtools = true;
  let PICtrash = true;
  let PICmusicbook = true;
  let PICcorruptedspace = true;
  let PICoilbuddies = true;
  let PIClitabok = true;
  let PICplastica = true;
  let PICfamiliarfaces = true;
  let PIClikamar = true;
  let PICoeb = true;
  let PICbeauimg = true;
  let PICbread = true;
  let PICflora = true;
  let PICbreadmag = true;
  let PICevublad = true;
  let PICsomalgors = true;

  let PICcalendarA = true;
  let PICcalendarB = true;
  let PICorgano = true;
  let PICbeyond = true;
  let PICtoomuch = true;
  let PICproverb = true;
  let PICpsdmynd = true;
  let PICfloraA = true;
  let PICcali = true;
  let PICbaby = true;
  let PICfimma = true;
  let PICleturgif = true;
  let PICpuppy = true;
  let PICtypobook = true;
  let PICbuyt = true;
  let PICshu = true;
  let PICrammi = true;
  let PICspurn = true;
  let PICmalverk = true;
  let PICflottabok = true;
  let PICljosmynd = true;
  let PICegoposter = true;
  let PICdrawing = true;
  let PICbritney = true;
  let PICbrandalism = true;
  let PICegobook = true;
  let PICmen = true;
  let PICalltmitt = true;

  const toggleWEB = () => { 
    PICtimatal = false; 
    PICsecret = false; 
    PICviv = false; 
    PICtypoposters = false; 
    PICmusicposters = false; 
    PICfamiliarfaces = false; 
    PIClitabok = false; 
    PICtrash = false; 
    PIClikamar = false;
    PICbreadmag = false; 
    PICbeauimg = false; 
    PICevublad = false;  
    PICbread = false; 
    PIConourowntime = true; 
    PICgreen = true; 
    PICportfolioio = true; 
    PICsortedplastic = true; 
    PICtools = false; 
    PICmusicbook = false; 
    PICcorruptedspace = false; 
    PICoilbuddies = false; 
    PICplastica = true; PICoeb = true; 
    PICflora = true; 
    PICsomalgors = true;

    PICcalendarA = false;
    PICcalendarB = false;
    PICorgano = true;
    PICbeyond = false;
    PICtoomuch = false;
    PICproverb = false;
    PICpsdmynd = false;
    PICfloraA = false;
    PICcali = false;
    PICbaby = false;
    PICfimma = false;
    PICleturgif = false;
    PICpuppy = false;
    PICtypobook = false;
    PICbuyt = true;
    PICshu = false;
    PICrammi = false;
    PICspurn = false;
    PICmalverk = false;
    PICflottabok = false;
    PICljosmynd = false;
    PICegoposter = false;
    PICdrawing = false;
    PICbritney = true;
    PICbrandalism = false;
    PICegobook = false;
    PICmen = false;
    PICalltmitt = true;
  }
  const togglePRINT = () => { 
    PICflora = false; 
    PIConourowntime = false; 
    PICgreen = true; 
    PICviv = true; 
    PICportfolioio = false; 
    PICtypoposters = true; 
    PICsecret = true; 
    PICsortedplastic = true; 
    PICmusicposters = true; 
    PICtimatal = true; 
    PICtools = true; 
    PICmusicbook = true; 
    PICcorruptedspace = true; 
    PICoilbuddies = false; 
    PICplastica = false; 
    PICfamiliarfaces = true; 
    PIClitabok = true; 
    PICtrash = true; 
    PIClikamar = false; 
    PICoeb = false; 
    PICbeauimg = true; 
    PICbread = true; 
    PICbreadmag = true; 
    PICevublad = true; 
    PICsomalgors = true;

    PICcalendarA = false;
    PICcalendarB = true;
    PICorgano = false;
    PICbeyond = true;
    PICtoomuch = true;
    PICproverb = true;
    PICpsdmynd = false;
    PICfloraA = false;
    PICcali = true;
    PICbaby = false;
    PICfimma = false;
    PICleturgif = false;
    PICpuppy = false;
    PICtypobook = true;
    PICbuyt = false;
    PICshu = false;
    PICrammi = true;
    PICspurn = false;
    PICmalverk = false;
    PICflottabok = true;
    PICljosmynd = false;
    PICegoposter = true;
    PICdrawing = false;
    PICbritney = false;
    PICbrandalism = true;
    PICegobook = true;
    PICmen = false;
    PICalltmitt = false;
  }
  const toggleVIDEO = () => { 
    PIConourowntime = false; 
    PICgreen = true; 
    PICviv = true; 
    PICportfolioio = false; 
    PICtypoposters = false; 
    PICsecret = false; 
    PICsortedplastic = false; 
    PICmusicposters = false; 
    PICtimatal = false; 
    PICtools = false; 
    PICmusicbook = true; 
    PICcorruptedspace = true; 
    PICoilbuddies = true; 
    PICplastica = false; 
    PICfamiliarfaces = true; 
    PIClitabok = false; 
    PICtrash = false; 
    PIClikamar = false; 
    PICoeb = false; 
    PICbeauimg = false; 
    PICbread = false; 
    PICflora = false; 
    PICbreadmag = false; 
    PICevublad = false; 
    PICsomalgors = false;

    PICcalendarA = false;
    PICcalendarB = false;
    PICorgano = false;
    PICbeyond = false;
    PICtoomuch = false;
    PICproverb = false;
    PICpsdmynd = false;
    PICfloraA = false;
    PICcali = false;
    PICbaby = false;
    PICfimma = false;
    PICleturgif = false;
    PICpuppy = false;
    PICtypobook = false;
    PICbuyt = false;
    PICshu = false;
    PICrammi = false;
    PICspurn = false;
    PICmalverk = false;
    PICflottabok = false;
    PICljosmynd = false;
    PICegoposter = false;
    PICdrawing = false;
    PICbritney = false;
    PICbrandalism = false;
    PICegobook = false;
    PICmen = true;
    PICalltmitt = false;
  }
  const toggleOTHER = () => { 
    PICflora = false; 
    PIConourowntime = false; 
    PICgreen = true; 
    PICviv = false; 
    PICportfolioio = false; 
    PICtypoposters = false; 
    PICsecret = false; 
    PICsortedplastic = false; 
    PICmusicposters = true; 
    PICtimatal = false; 
    PICtools = false; 
    PICmusicbook = false; 
    PICcorruptedspace = false; 
    PICoilbuddies = false; 
    PICplastica = false; 
    PICfamiliarfaces = false; 
    PIClitabok = true; 
    PICtrash = true; 
    PIClikamar = true; 
    PICoeb = true; 
    PICbeauimg = true; 
    PICbread = true; 
    PICbreadmag = false; 
    PICevublad = false; 
    PICsomalgors = false;

    PICcalendarA = true;
    PICcalendarB = false;
    PICorgano = false;
    PICbeyond = false;
    PICtoomuch = false;
    PICproverb = false;
    PICpsdmynd = true;
    PICfloraA = true;
    PICcali = true;
    PICbaby = true;
    PICfimma = true;
    PICleturgif = true;
    PICpuppy = false;
    PICtypobook = false;
    PICbuyt = false;
    PICshu = true;
    PICrammi = true;
    PICspurn = true;
    PICmalverk = true;
    PICflottabok = false;
    PICljosmynd = true;
    PICegoposter = false;
    PICdrawing = true;
    PICbritney = false;
    PICbrandalism = false;
    PICegobook = false;
    PICmen = true;
    PICalltmitt = false;
  }
  const toggleALL = () => { 
    PIConourowntime = true; 
    PICgreen = true; 
    PICviv = true; 
    PICportfolioio = true; 
    PICtypoposters = true; 
    PICsecret = true; 
    PICsortedplastic = true; 
    PICmusicposters = true; 
    PICtimatal = true; 
    PICtools = true; 
    PICmusicbook = true; 
    PICcorruptedspace = true; 
    PICoilbuddies = true; 
    PICplastica = true; 
    PICfamiliarfaces = true; 
    PIClitabok = true; 
    PICtrash = true; 
    PIClikamar = true; 
    PICoeb = true; 
    PICbeauimg = true; 
    PICbread = true; 
    PICflora = true; 
    PICbreadmag = true; 
    PICevublad = true; 
    PICsomalgors = true;

    PICcalendarA = true;
    PICcalendarB = true;
    PICorgano = true;
    PICbeyond = true;
    PICtoomuch = true;
    PICproverb = true;
    PICpsdmynd = true;
    PICfloraA = true;
    PICcali = true;
    PICbaby = true;
    PICfimma = true;
    PICleturgif = true;
    PICpuppy = true;
    PICtypobook = true;
    PICbuyt = true;
    PICshu = true;
    PICrammi = true;
    PICspurn = true;
    PICmalverk = true;
    PICflottabok = true;
    PICljosmynd = true;
    PICegoposter = true;
    PICdrawing = true;
    PICbritney = true;
    PICbrandalism = true;
    PICegobook = true;
    PICmen = true;
    PICalltmitt = true;
  }



</script>


<div class="buttonWrapper">
  <div class="button" on:click={toggleWEB}>WEB</div>
  <div class="button" on:click={togglePRINT}>PRINT</div>
  <div class="button" on:click={toggleVIDEO}>VIDEO</div>
  <div class="button" on:click={toggleOTHER}>OTHER</div>
  <div class="button" on:click={toggleALL}>ALL</div>
</div>



<div id="Screen" class="containerMiddleScroll" class:expand>
  <!--<div class="dragAnnounceMobile">!! Mobile version under construction !!</div>-->

  <div class="menu" on:click="{() => expand = !expand}"><!--&swarr; -->MENU</div>

 <!-- <div class="info">
    <img class="logo" src="igms/icons/BBJsmall.png">
    <div class="more">
     	Berglind Brá Jóhannsdóttir<br>
     	Graphic Designer<br><br>
     	berglindbra28@gmail.com
    </div>
  </div>-->

  <div class="date mainscreen-main">
  	{#if frontscreen}August 2020{/if}
  	{#if onourowntime}Spring 2020{/if}
  	{#if green}Winter 2019-2020{/if}
  	{#if viv}Spring 2017{/if}
  	{#if portfolioio}Spring 2019 - 2020{/if}
  	{#if typoposters}Autumn 2018{/if}
  	{#if beauimg}Spring 2019{/if}
  	{#if secret}Spring 2017{/if}
  	{#if sortedplastic}Autumn 2018{/if}
  	{#if oeb}Spring 2019{/if}
  	{#if musicposters}Spring 2019{/if}
  	{#if timatal}Spring 2018{/if}
  	{#if tools}Spring 2018{/if}
  	{#if trash}Spring 2018{/if}
  	{#if musicbook}Autumn 2016{/if}
  	{#if corruptedspace}Spring 2018{/if}
  	{#if oilbuddies}Spring 2017{/if}
  	{#if litabok}Spring 2018{/if}
  	{#if plastica}Autumn 2018{/if}
  	{#if familiarfaces}Autumn 2018{/if}
  	{#if likamar}Spring 2019 - 2020{/if}
  	{#if bread}Spring 2019{/if}
  	{#if breadmag}Spring 2019{/if}
  	{#if flora}Summer 2018 - ongoing{/if}
    {#if evublad}Spring 2018{/if}
  </div>

  <div class="subtitlesDate mainscreen-subtitles"><span class="subtitles-text">
  	{#if frontscreen}Page last updated<br>27th of August, 2020.{/if}
  	{#if onourowntime}...{/if}
  	{#if green}...{/if}
  	{#if viv}...{/if}
  	{#if bread}...{/if}
  	{#if breadmag}...{/if}
  	{#if portfolioio}...{/if}
  	{#if typoposters}...{/if}
  	{#if beauimg}...{/if}
  	{#if secret}...{/if}
  	{#if sortedplastic}...{/if}
  	{#if oeb}...{/if}
  	{#if musicposters}...{/if}
  	{#if timatal}...{/if}
  	{#if tools}...{/if}
  	{#if trash}...{/if}
  	{#if musicbook}...{/if}
  	{#if corruptedspace}...{/if}
  	{#if oilbuddies}...{/if}
  	{#if litabok}...{/if}
  	{#if plastica}...{/if}
  	{#if familiarfaces}...{/if}
  	{#if likamar}Typeface initially designed in 2019, refined for Flóra útgáfa in 2020.{/if}
  	{#if flora}Current website mostly designed and built in Summer 2020.{/if}
    {#if evublad}...{/if}
  </span></div>

  <div class="name mainscreen-main">
  	{#if frontscreen}Berglind Brá{/if}
  	{#if onourowntime}<a href="https://onourowntime.today/" target="_blank">On our own time</a>{/if}
  	{#if green}GREEN<br>Towards a Guidebook<br>for Ecocritical Graphic Design{/if}
  	{#if viv}Vivienne Westwood by Tim Blanks{/if}
  	{#if bread}Bread & Demonstrations{/if}
  	{#if breadmag}"Let them eat Brioche"{/if}
  	{#if portfolioio}<a href="https://0i0i.github.io/" target="_blank">Io Sivertsen<br>Portfolio Website</a>{/if}
  	{#if typoposters}10 typefaces{/if}
  	{#if beauimg}"Beautiful image"{/if}
  	{#if secret}Secret book{/if}
  	{#if sortedplastic}Where does our sorted plastic go?{/if}
  	{#if oeb}OEB{/if}
  	{#if musicposters}Four Corners /<br>Cause We've Ended As Lovers<br>/ Pinball{/if}
  	{#if timatal}Tímatal{/if}
  	{#if tools}Tools of Expession{/if}
  	{#if trash}A(nother) Drop in the Ocean{/if}
  	{#if musicbook}Where we're from<br>the birds sing a<br>pretty song and<br>there's always music<br>in the air.{/if}
  	{#if corruptedspace}Corrupted Space{/if}
  	{#if oilbuddies}Bubble boys{/if}
  	{#if litabok}The Colorful Richness of Black and White{/if}
  	{#if plastica}Plastica{/if}
  	{#if familiarfaces}Familiar Faces{/if}
  	{#if likamar}Untitled Typeface{/if}
  	{#if flora}<a href="https://flora-utgafa.is/" style="color: lightblue !important;" target="_blank">Flóra útgáfa</a>{/if}
    {#if evublad}Artist Interview<br>Eva Sigurðardóttir{/if}
  </div>
  <div class="subtitlesName mainscreen-subtitles">
    <span class="subtitles-text">
    	{#if frontscreen}Welcome to my portfolio!<br>Browse through my projects on the right and click to see more details.{/if}
		{#if onourowntime}Fundraiser / Catalogue website for Graphic Design and Non Linear Narrative, The Royal Academy of Art in The Hague, graduation class of 2020. Website design and building collaboration with Trang Ha, identity designed by Zahari Dimitrov and Zuzanna Zgierska using typefaces by Edward Dżułaj and Nedislav Kamburov.{/if}
	  	<!--{#if green}...{/if}-->
	  	{#if viv}A publication containing an interview with Vivienne Westwood by Tim Blanks (published in Interview Magazine, July 18, 2012) along with added content related to topics mentioned in the interview. Printed on A3 and folded into a a-bit-wider-than-A4 format.{/if}
	  	{#if typoposters}20 posters celebrating 10 different typefaces. Printed front and back on 10 A2-sized sheets, and folded into A4 for storage.{/if}
		{#if secret}An anonymous's secret, translated into a foldout A6-size hardcover book.{/if}
		{#if tools}A publication holding an archive of different communication tools. A5-size.{/if}
		{#if timatal}A collection of different ideas and imaginations of time and time-keeping. A kind of non-calendar calendar.<br>Content gathered from a single book found in a library (and returned before I thought of doucumenting it (rookie mistake) so the source remains a mystery).{/if}
		{#if sortedplastic}A research project, collaboration with Louana Gentner, on where plastic &mdash; sorted by residents of the Hague and delivered to local bins to be recycled &mdash; ends up. An interesting disappointment, documented in an A3-size publication and an online tetris-style game.{/if}
		{#if litabok}An installation and publication.{/if}
		{#if oilbuddies}The heads of the worlds biggest oil-companies in 2017, in bubbles, floating around, ...headed to wherever the weahter suits their clothes?{/if}
		{#if trash}A set of stickers for the trash-bins of KABK as a call for recycling. Typeface made out of KABK's logo.{/if}
	  	{#if familiarfaces}Posters, digital and physical, made in collaboration with Seojeong Youn.{/if}
	  	{#if musicbook}A publication and a video about music's effect on humans, as seen through Stevie&nbsp;Wonder's 'If&nbsp;It's&nbsp;Magic', Dorothy&nbsp;Ashby, David&nbsp;Lynch, Meditation, Mantras and Patterns.{/if}
	  	{#if plastica}A Website and A Chrome extension, where I recreated Google as Plastica. A merging of two (supposedly) integral parts of my life.{/if}
	  	{#if corruptedspace}Posters, digital and physical, for a lecture series organized by INSIDE Master Interior Architecture and IAFD.{/if}
		<!--{#if bread}...{/if}
	  	{#if portfolioio}...{/if}
	  	{#if beauimg}...{/if}
	  	{#if oeb}...{/if}
	  	{#if musicposters}...{/if}-->	
  		{#if likamar}Typeface initially designed in 2019, refined for Flóra útgáfa in 2020.{/if}
  		{#if green}Graphic Design Bachelor thesis from Royal Academy of Art, the Hague.{/if}
      {#if evublad}Studio visit and interview with artist Eva Sigurðardóttir. Eva's handwriting is used to translate integral parts of the interview from Icelandic to English.{/if}
    </span>
  </div>

  {#if onourowntime}<Onourowntime></Onourowntime>{/if}
  {#if green}<Green></Green>{/if}
  {#if viv}<Vivienne></Vivienne>{/if}
  {#if portfolioio}<Portfolioio></Portfolioio>{/if}
  {#if typoposters}<Typoposters></Typoposters>{/if}
  {#if secret}<Secret></Secret>{/if}
  {#if sortedplastic}<SortedPlastic></SortedPlastic>{/if}
  {#if musicposters}<MusicPosters></MusicPosters>{/if}
  {#if timatal}<Timatal></Timatal>{/if}
  {#if tools}<ToolsOfExpression></ToolsOfExpression>{/if}
  {#if trash}<Trash></Trash>{/if}
  {#if musicbook}<MusicBook></MusicBook>{/if}
  {#if corruptedspace}<Corrupted></Corrupted>{/if}
  {#if oilbuddies}<OilBuddies></OilBuddies>{/if}
  {#if litabok}<Litabok></Litabok>{/if}
  {#if plastica}<Plastica></Plastica>{/if}
  {#if familiarfaces}<FamiliarFaces></FamiliarFaces>{/if}
  {#if likamar}<Likamar></Likamar>{/if}
  {#if oeb}<Oeb></Oeb>{/if}
  {#if beauimg}<Beauimg></Beauimg>{/if}
  {#if bread}<Bread></Bread>{/if}
  {#if flora}<Flora></Flora>{/if}
  {#if breadmag}<Breadmag></Breadmag>{/if}
  {#if evublad}<Evublad></Evublad>{/if}
  
  
</div>

<div class="biography">
		
  <div class="biography-text">
      <img class="logoBio" alt="mynd" src="igms/icons/BBJsmall2.png"><br><br>
      BERGLIND BRÁ<br><br>
      <i>Education</i><br>
      Sjónlist 2015, Myndlistaskólinn í Reykjavík<br>
      Graphic Design BA 2020, The Royal Academy of Art, The Hague
      <br><br>
      <span class="out-on-mobile"><i>Work experience</i><br>
      Web building / graphic design for Flóra útgáfa<br>
      Internship at Somalgors74 / Curdin Tones<br>
      Portfolio website for photographer Io Alexa Sivertsen<br><br></span>
      <!--<i>Experties</i><br>
      Webdesign<br><br>-->
      
      <i>Contact</i><br>
      berglindbra28@gmail.com<br>
      <!--instagram (I don't really feed it content but can be contacted through it!)-->
      <span class="out-on-desktop construction" style="text-align: center;"><br><br>**MOBILE VERSION IS UNDER CONSTRUCTION**</span>
  </div>
</div>




<div class="container">

  <div class="wrapper back">
    <div class="caption">
      Work
    </div>
    <div class="out-on-desktop"></div>
    <br><br><br><br>
    
    
    {#if PICflora}<img class="smallPic" alt="mynd" src="igms/flora/small.png" on:click={toggleflora} on:click="{() => expand = !expand}">{/if}
    {#if PIConourowntime}<img class="smallPic" alt="mynd" src="igms/onourowntime/small.png" on:click={toggleonourowntime} on:click="{() => expand = !expand}">{/if}
    {#if PICgreen}<img class="smallPic" alt="mynd" src="igms/thesis/small.jpg" on:click={togglegreen} on:click="{() => expand = !expand}">{/if}
    {#if PICviv}<img class="smallPic" alt="mynd" src="igms/viv/small.png" on:click={toggleviv} on:click="{() => expand = !expand}">{/if}
    {#if PICbread}<img class="smallPic" alt="mynd" src="igms/bread/small.jpg" on:click={togglebread} on:click="{() => expand = !expand}">{/if}
    {#if PICbreadmag}<img class="smallPic" alt="mynd" src="igms/bread/breadmag.jpg" on:click={togglebreadmag} on:click="{() => expand = !expand}">{/if}
    {#if PICportfolioio}<img class="smallPic" alt="mynd" src="igms/io/small.png" on:click={toggleportfolioio} on:click="{() => expand = !expand}">{/if}
    {#if PICbeauimg}<img class="smallPic" alt="mynd" src="igms/beauimg/small.jpg" on:click={togglebeauimg} on:click="{() => expand = !expand}">{/if}
    {#if PICtypoposters}<img class="smallPic" alt="mynd" src="igms/typoPosters/3.jpg" on:click={toggletypoposters} on:click="{() => expand = !expand}">{/if}
    <!--<img class="smallPic" alt="mynd" src="igms/secret/small.png" on:click={togglesecret} on:click="{() => expand = !expand}">-->
    {#if PICoeb}<img class="smallPic" alt="mynd" src="igms/oeb/small.png" on:click={toggleoeb} on:click="{() => expand = !expand}">{/if}
    {#if PICsortedplastic}<img class="smallPic" alt="mynd" src="igms/sortedPlastic/small.png" on:click={togglesortedplastic} on:click="{() => expand = !expand}">{/if}
    {#if PICmusicposters}<img class="smallPic" alt="mynd" src="igms/musicPosters/small.jpg" on:click={togglemusicposters} on:click="{() => expand = !expand}">{/if}
    {#if PICtimatal}<img class="smallPic" alt="mynd" src="igms/timatal/small.png" on:click={toggletimatal} on:click="{() => expand = !expand}">{/if}
    {#if PICtools}<img class="smallPic" alt="mynd" src="igms/tools/tools.png" on:click={toggletools} on:click="{() => expand = !expand}">{/if}
    <!--<img class="smallPic" alt="mynd" src="igms/body/body.png">-->
    {#if PICsomalgors}<img class="smallPic" alt="mynd" src="igms/somalgors74/small.jpg">{/if}
	  {#if PIClikamar}<img class="smallPic" alt="mynd" src="igms/typedesign/small.jpg" on:click={togglelikamar} on:click="{() => expand = !expand}">{/if}
	  <!--<img class="smallPic" alt="mynd" src="igms/cali/small.jpg"> OTHER -->
	  {#if PICsecret}<img class="smallPic" alt="mynd" src="igms/secret/small.png" on:click={togglesecret} on:click="{() => expand = !expand}">{/if}
	  {#if PICmusicbook}<img class="smallPic" alt="mynd" style="max-width: 430px !important;" src="igms/musicBook/4.png" on:click={togglemusicbook} on:click="{() => expand = !expand}">{/if}
  	{#if PICcorruptedspace}<img class="smallPic" alt="mynd" src="igms/corruptedspace/smaller.jpg" on:click={togglecorruptedspace} on:click="{() => expand = !expand}">{/if}
    {#if PICevublad}<img class="smallPic" alt="mynd" src="igms/evublad/evublad-spreads0.jpg" on:click={toggleevublad} on:click="{() => expand = !expand}">{/if}
  	{#if PICfamiliarfaces}<img class="smallPic" alt="mynd" src="igms/familiarfaces/small.jpg" on:click={togglefamiliarfaces} on:click="{() => expand = !expand}">{/if}
    {#if PIClitabok}<img class="smallPic" alt="mynd" style="max-width: 230px;" src="igms/litabok/small.png" on:click={togglelitabok} on:click="{() => expand = !expand}">{/if}
  	{#if PICtrash}<img class="smallPic" alt="mynd" src="igms/trash/small.png" on:click={toggletrash} on:click="{() => expand = !expand}">{/if}
    <!--<img class="smallPic" alt="mynd" src="igms/alterego/small.png"> OTHER -->
    <!--<img class="smallPic" alt="mynd" src="igms/grad/small.png">-->
    <!--<img class="smallPic" alt="mynd" src="igms/buyt/small.png"> OTHER -->
    <!--<img class="smallPic" alt="mynd" src="igms/faces/small.png"> OTHER -->
    {#if PICplastica}<img class="smallPic" alt="mynd" src="igms/plastica/small2.png" on:click={toggleplastica} on:click="{() => expand = !expand}">{/if}
    {#if PICoilbuddies}<img class="smallPic" alt="mynd" style="border-radius: 50px;" src="igms/oilbuddies/small.png" on:click={toggleoilbuddies} on:click="{() => expand = !expand}">{/if}



    
	    <div class="line"></div>
		{#if other}
	    <!--<img class="mediumPic" src="igms/undefined-teikningar/upprodun2.jpg">-->
	    {#if PICcalendarA}<img class="mediumPic" alt="mynd" src="igms/undefined-teikningar/ulines.png">{/if}
	    {#if PICcalendarB}<img class="mediumPic" alt="mynd" src="igms/undefined-teikningar/upprodun3rettmeddrasli2.jpg">{/if}
	    {#if PICorgano}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/organo.jpg">{/if}
	    {#if PICbeyond}<img class="mediumPic" alt="mynd" src="igms/undefined-posters/2.jpg">{/if}
	    {#if PICtoomuch}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/toomuchtoseelevel.jpg">{/if}
	    {#if PICproverb}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/aproverb.jpg">{/if}
	    <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/1tvenna.png">-->
	    <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/mynd12.png">-->
	    <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/blubb_Page_06.jpg">-->
	    {#if PICpsdmynd}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/blubb_Page_14b.jpg">{/if}
	    <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/blubb_Page_16.jpg">-->
	    <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/blubb_Page_19.jpg">-->
	    {#if PICfloraA}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/5utgafa-ut.jpg">{/if}
	    <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/prufur-31.gif">-->
	    <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/typoblack.png">-->
	    <!--<img class="mediumPic" alt="mynd" src="igms/cali/small.jpg">-->
	    {#if PICcali}<img class="mediumPic" alt="mynd" src="igms/cali/cali1.jpg">{/if}
	    <!--<img class="mediumPic" alt="mynd" alt="mynd" src="igms/cali/cali2.jpg">-->
	    {#if PICcali}<img class="mediumPic" alt="mynd" src="igms/cali/cali3.jpg">{/if}
	    <!--<img class="mediumPic" alt="mynd" src="igms/cali/cali4.jpg">-->
	    {#if PICbaby}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/smallbaby.png">{/if}
	    {#if PICfimma}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/5red1.png">{/if}
	    {#if PICleturgif}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/ok.gif">{/if}
      {#if PICpsdmynd}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/mynd12.png">{/if}
	    <!--<img class="mediumPic" alt="mynd" src="igms/undefined-teikningar/bluelines.jpg">-->
	    {#if PICpuppy}<img class="mediumPic" alt="mynd" style="max-width: 30vw;" src="igms/undefined-posters/KABKPuppyParade.jpg">{/if}
      {#if PICtypobook}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/typography.jpg">{/if}
	    <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/blom2b.jpg">-->
      <!--<img class="mediumPic" alt="mynd" src="igms/undefined-teikningar/fruma.jpg">-->
      {#if PICbuyt}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/5web.jpg">{/if}
	    {#if PICshu}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/skoh.jpg">{/if}
	    {#if PICrammi}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/rammi.jpg">{/if}
	    {#if PICspurn}<img class="mediumPic" alt="mynd" style="max-width: 30vw;" src="igms/undefined-undefined/spurn.png">{/if}
      {#if PICpsdmynd}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/blomnytt2.jpg">{/if}
      {#if PICmalverk}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/mamma.jpg">{/if}
	    {#if PICleturgif}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/oohnoo.gif">{/if}
	    {#if PICflottabok}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/front.png">{/if}
      <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/smellt-drawing.jpg">-->
      {#if PICtypobook}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/display1.jpg">{/if}
      {#if PICtypobook}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/display2.jpg">{/if}
      {#if PICtypobook}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/display3.jpg">{/if}
      {#if PICljosmynd}<img class="mediumPic" alt="mynd" src="igms/undefined-ljosmyndir/tschlin.jpg">{/if}
      {#if PICljosmynd}<img class="mediumPic" alt="mynd" src="igms/undefined-ljosmyndir/simiafjalli.jpg">{/if}
      <!--<img class="mediumPic" alt="mynd" src="igms/undefined-ljosmyndir/P1150285.JPG">
      {#if PICljosmynd}<img class="mediumPic" alt="mynd" src="igms/undefined-ljosmyndir/fjall.jpg">{/if}-->
      <!--<img class="mediumPic" alt="mynd" src="igms/undefined-ljosmyndir/IMG_7173.JPG">-->
      <!--<img class="mediumPic" alt="mynd" src="igms/undefined-ljosmyndir/prent f fólk3106.jpg">-->
      {#if PICegoposter}<img class="mediumPic" alt="mynd" src="igms/undefined-posters/otherPoster.jpg">{/if}
      {#if PICdrawing}<img class="mediumPic" alt="mynd" src="igms/undefined-teikningar/teikning1.jpg">{/if}
      {#if PICdrawing}<img class="mediumPic" alt="mynd" src="igms/undefined-teikningar/teikning2.jpg">{/if}
      {#if PICdrawing}<img class="mediumPic" alt="mynd" src="igms/undefined-teikningar/teikning3.jpg">{/if}
      {#if PICalltmitt}<img class="mediumPic" alt="mynd" src="igms/alltmitt/1.png">{/if}
      {#if PICpsdmynd}<img class="mediumPic" alt="mynd" style="border-radius: 120px;" src="igms/undefined-undefined/_.jpg">{/if}
      {#if PICbritney}<img class="mediumPic" alt="mynd" src="igms/undefined-web/7.jpg">{/if}
      {#if PICbrandalism}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/15.png">{/if}
      {#if PICbrandalism}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/14.png">{/if}
      <!--<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/13.png">-->
      {#if PICegobook}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/1.png">{/if}
      {#if PICmen}<img class="mediumPic" alt="mynd" src="igms/undefined-undefined/aSmalltable.png">{/if}
      <br><br><br><br><br><br>
    {/if}

    
  </div>

</div>






<!--
<Footer></Footer>
-->




<style>

.expand {
	background-color: #f7f6f2;
    right: -1px;
    bottom: -1px;
    top: -1px;
    left: -1px;

    font-size: 1.2vw !important;

  }

  .line {
  	position: relative;
  	width: 80%;
  	height: .5px;
  	background-color: #027967;
  	margin-left: 10%;
  	margin-top: 100px;
  	margin-bottom: 100px;
  }
  .line:after {
  	content: 'OTHER / UNPUBLISHED / UNFINISHED / UNDEFINED / UNREFINED';
  	position: absolute;
  	width: 100%;
  	height: auto;
  	top: calc(100% + 5px);
  	left: 0%;
  	text-align: center;
  }


@media screen and (max-width: 1000px) {

.expand {
	font-size: 3.3vw !important;
}


}

</style>