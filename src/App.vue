<template>
  <v-app dark>
    <v-main class="app-shell">
      <v-container fluid class="fill-height pa-0">
        <v-row no-gutters class="fill-height align-center justify-center">
            <div class="game-card">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <div class="text-h5 font-weight-bold green--text">Nerdle</div>
                </div>
                <v-btn-toggle mandatory v-model="mode" rounded>
                    <v-btn color="green" :class="{'white--text': mode == 0}" rounded x-small>Daily</v-btn>
                    <v-btn color="blue" :class="{'white--text': mode == 1}" rounded x-small>Random</v-btn>
                </v-btn-toggle>
              </div>

                <div class="board-area">
                  <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="guess-group">
                    <div class="guess-row">
                      <div class="guess-cells">
                        <template v-if="row.submitted">
                          <div v-for="(cell, colIndex) in row.cells" :key="`${rowIndex}-${colIndex}`" class="cell filled">
                            {{ cell }}
                          </div>
                        </template>
                        <template v-else-if="!gameCompleted">
                          <input
                            v-for="(cell, colIndex) in row.cells"
                            :key="`${rowIndex}-${colIndex}`"
                            @click="selectedCellIndex = colIndex"
                            class="cell input-cell"
                            :class="{ active: colIndex === 0 || row.cells.some(value => value !== ''), selected: colIndex === selectedCellIndex }"
                            type="text"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            maxlength="1"
                            :value="cell"
                            readonly
                            tabindex="-1"
                          />
                        </template>
                      </div>

                    <div v-if="row.submitted" class="feedback-shell">
                      <v-progress-circular
                        :value="row.score * 100"
                        color="green"
                        rotate="-90"
                      >
                        <span class="progress-label">{{ Math.round(row.score * 100) }}%</span>
                      </v-progress-circular>
                    </div>
                    <div v-else-if="!gameCompleted" class="feedback-shell muted">
                      <v-progress-circular value="0" color="grey darken-2" rotate="-90"/>
                    </div>
                  </div>

                  <div v-if="rowIndex == rows.length - 2" class="tag-panel">
                    <div v-for="(tag, i) in tagsToShow" :key="i" class="tag-chip-wrap">
                      <v-tooltip v-if="tag !== 'divider'" bottom open-on-hover open-on-click>
                        <template v-slot:activator="{ on, attrs }">
                          <v-chip
                            v-bind="attrs"
                            v-on="on"
                            small
                            :color="isGoalTag(tag) ? 'green' : 'grey darken-3'"
                            :text-color="draftStops.includes(tag) ? 'rgb(255,0,0)' : 'white'"
                          >
                            {{ getTagLabel(tag) }}
                          </v-chip>
                        </template>
                        <div style="text-align: center;">{{ getTagDescription(tag) }}</div>
                      </v-tooltip>
                      <v-divider v-else vertical color="white"></v-divider>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="isMobile && !gameCompleted && guesses.length < maxRows" class="mobile-keypad">
                <div class="mobile-keypad-head">
                  <v-btn icon @click="clearDraftGuess" color="grey"><v-icon>mdi-delete-outline</v-icon></v-btn>
                  <v-btn icon @click="removeLatestDigit" color="grey"><v-icon>mdi-backspace-outline</v-icon></v-btn>
                </div>
                <div class="mobile-keypad-grid">
                  <v-btn
                    v-for="digit in mobileDigits"
                    :key="digit"
                    depressed
                    class="mobile-keypad-btn white--text"
                    color="rgba(76, 175, 80, 0.14)"
                    @click="pressDigit(digit)"
                  >{{ digit }}</v-btn>
                </div>
              </div>

              <div class="action-bar" :class="{ 'mobile-action-bar': isMobile }">
                <v-btn small outlined color="green" @click="openTutorial">How to play</v-btn>
                <div class="text-caption grey--text text--lighten-1">Guess {{ guesses.length }} of {{ maxRows }}</div>
                <v-btn
                  small
                  color="green"
                  dark
                  class="action-lock-btn"
                  :disabled="!isGuessComplete || draftStops.length > 0 || gameCompleted || guesses.length >= maxRows"
                  @click="submitGuess"
                >Lock in</v-btn>
              </div>
            </div>
        </v-row>
      </v-container>
    </v-main>

    <v-dialog v-model="tutorialDialog" max-width="760px" :fullscreen="$vuetify.breakpoint.xsOnly">
      <v-card class="tutorial-card" color="rgba(18, 24, 20, 0.98)" dark>
        <div class="tutorial-header">
          <v-chip class="tutorial-step-pill" color="rgba(76, 175, 80, 0.16)">{{ tutorialStep + 1 }} of 3</v-chip>
          <v-btn icon dark small class="tutorial-close" @click="closeTutorial">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="tutorial-body">
          <div v-if="tutorialStep === 0" class="tutorial-page">
            <div class="tutorial-eyebrow">Welcome</div>
            <div class="text-h5 font-weight-bold green--text mb-2">Find the secret five-digit number.</div>
            <p class="tutorial-copy">
              The goal is to discover the goal five-digit number by making guesses that get progressively closer.
              Each round gives you new clues that narrow the field until you can lock in the answer.
            </p>
          </div>

          <div v-else-if="tutorialStep === 1" class="tutorial-page">
            <div class="tutorial-eyebrow">Tags</div>
            <div class="text-h5 font-weight-bold green--text mb-2">Use the tags as your clues.</div>
            <p class="tutorial-copy">
              Every number has a set of properties - or tags. Green tags mean the target number shares that trait, while grey tags mean it does not.
              Some tags describe the number’s properties, such as “Even” or “&lt; 50,000”, and others describe structure, such as “Upstart” (the second digit is larger than the first).
            </p>
            <div class="tutorial-visual-card">
              <div class="tag-sample">
                <v-chip small color="green" text-color="white" class="ma-1">Even</v-chip>
                <v-chip small color="grey darken-3" text-color="white" class="ma-1">&lt; 50,000</v-chip>
                <v-chip small color="green" text-color="white" class="ma-1">Upstart</v-chip>
              </div>
              For example, the goal is even and has an Upstart, but is not less than 50,000
            </div>
          </div>

          <div v-else class="tutorial-page">
            <div class="tutorial-eyebrow">Locking in</div>
            <div class="text-h5 font-weight-bold green--text mb-2">Only guesses that fit every constraint are allowed.</div>
            <p class="tutorial-copy">
              You cannot lock in a guess that includes any grey tag (the target does not have), or that is missing any green tag (the target does have).
              If a guess breaks those rules, it will be blocked and you will need to refine it.
            </p>
            <div class="tutorial-visual-card">
                <img alt="Example Invalid Guess" :src="example" style="max-width: 70%;"/>
                <br>For example, this guess cannot be locked in because it is even (when the goal isn't), and the sum <b>isn't</b> even, (when the goal's is).
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="justify-space-between pb-4 px-4">
          <v-btn icon text color="grey lighten-2" @click="tutorialStep = Math.max(0, tutorialStep - 1)" v-if="tutorialStep > 0"><v-icon>mdi-arrow-left-bold</v-icon></v-btn>
          <div v-else class="spacer"></div>
          <v-btn color="green" dark @click="tutorialStep === 2 ? closeTutorial() : advanceTutorial()" :icon="tutorialStep !== 2">
            {{ tutorialStep === 2 ? 'Good luck!' : '' }}
            <v-icon v-if="tutorialStep !== 2">mdi-arrow-right-bold</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="winDialog" max-width="50vw" :fullscreen="$vuetify.breakpoint.xsOnly" persistent>
      <v-card class="celebration-card" color="rgba(18, 24, 20, 0.98)" :dark="true">
        <v-card-title class="justify-center text-h5 green--text">Yippee, you solved it!</v-card-title>
        <v-card-text class="text-center">
          <div class="text-h6 green--text">You found the answer in {{ guesses.length }} guess{{ guesses.length === 1 ? '' : 'es' }}.</div>
          <div class="mb-3">
            <div class="font-weight-bold mb-1">Answer</div>
            <div class="answer-pill">{{ goalGuessText }}</div>
          </div>
          <div>
            <div class="font-weight-bold mb-2">Tags</div>
            <div class="tag-row" v-if="goal">
              <v-chip
                v-for="tag in goal.tags"
                :key="tag"
                small
                color="green"
                text-color="white"
                class="ma-1"
              >
                {{ getTagLabel(tag) }}
              </v-chip>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="justify-center pb-4">
          <v-btn color="blue" dark @click="winDialog = false" text rounded outlined>Nice!</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import seedrandom from 'seedrandom'
import example from "./assets/example.png"

export default {
  mounted() {
    document.title = 'Nerdle'
    this.handleResize()
    window.addEventListener('keydown', this.handleGlobalKeydown)
    window.addEventListener('resize', this.handleResize)
    let dailyGoal = null
    const today = new Date().toLocaleString("en-US", {timeZone: "America/New_York"}).split(',')[0]
    let random = seedrandom(today)
    while (dailyGoal === null || this.skips.has(dailyGoal.join(''))) {
        dailyGoal = Math.floor(random() * 100000).toString().padStart(5, '0').split('').map(Number)
    }
    let savedGoal = JSON.parse(localStorage.getItem("goal"))
    if (savedGoal !== null && dailyGoal.join('') === savedGoal.guess.join('')) {
        this.dailyGoal = savedGoal
        this.dailyGuesses = JSON.parse(localStorage.getItem("guesses"))
    }
    if (this.dailyGoal !== null && this.dailyGuesses !== null) {
        this.dailyGuesses.forEach(guess => {
            guess.tags.forEach(tag => {
                if (this.dailyGoal.tags.includes(tag)) {
                    this.knownTrueTags.add(tag)
                } else {
                    this.knownFalseTags.add(tag)
                }
            })
        })
        this.gameCompleted = this.guesses.length > 0 && this.guesses[this.guesses.length-1].guess.join('') === this.goal.guess.join('')
        if (this.gameCompleted) {
            this.winDialog = true
        }
    } else {
        this.dailyGoal = {
            guess: dailyGoal,
            tags: this.getTags(dailyGoal)
        }
    }
    
    console.log(today, dailyGoal)
    // Find dupes
    // let startTime = performance.now()
    // let tagMap = {}
    // for (let i = 0; i < 100000; i++) {
    //     let guess = i.toString().padStart(5, '0').split('').map(Number)
    //     let tags = this.getTags(guess)
    //     tags.sort()
    //     const tagKey = tags.join(',')
    //     if (!tagMap[tagKey]) {
    //         tagMap[tagKey] = []
    //     }
    //     tagMap[tagKey].push(guess)
    // }
    // let dupes = Object.values(tagMap).filter(arr => arr.length > 1)
    // console.log('Numbers that share tags: ', dupes.flat().length)
    // let ind = Math.floor(Math.random() * dupes.length)
    // console.log('Sample', dupes.slice(ind, ind + 10))
    // console.log('Time taken to generate tag map: ', performance.now() - startTime, 'ms')
    // console.log(dupes.flat().map(num => num.join('')))
    // Nerdle bot
    //this.tagMap = {}
    // for (let i = 0; i < 100000; i++) {
    //     let guess = i.toString().padStart(5, '0').split('').map(Number)
    //     let tags = this.getTags(guess)
    //     tags.sort()
    //     const tagKey = tags.join(',')
    //     if (!this.tagMap[tagKey]) {
    //         this.tagMap[tagKey] = []
    //     }
    //     this.tagMap[tagKey].push(guess)
    // }
    // console.log("tags mapped")
    // console.log(Object.entries(this.tagMap).toSorted((b,a) => b[0].length - a[0].length)[0][1])

  },

  beforeDestroy() {
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    window.removeEventListener('resize', this.handleResize)
  },

  data() {
    return {
      tagMap: {},
      mode: 0,
      example: example,
      isMobile: false,
      guessLength: 5,
      maxRows: 5,
      draftGuess: Array(5).fill(''),
      selectedCellIndex: 0,
      dailyKnownFalseTags: new Set(),
      dailyKnownTrueTags: new Set(),
      randomKnownFalseTags: new Set(),
      randomKnownTrueTags: new Set(),
      dailyGoal: null,
      randomGoal: null,
      dailyGuesses: [],
      randomGuesses: [],
      gameCompleted: false,
      winDialog: false,
      tutorialDialog: false,
      tutorialStep: 0,
      history: [],
      skips: new Set(["01473","03471","01493","03491","01563","03561","01893","03891","02046","04026","02049","04029","02059","05029","02068","06028","02069","06029","02169","26109","02535","03525","02539","03529","02554","05542","02637","03627","02649","04629","24609","02739","03729","02746","04726","02747","04727","24707","02749","04729","24709","02757","05727","02759","05729","25709","02808","04824","02846","04826","02847","04827","24807","02857","05827","02859","05829","02868","06828","02869","26809","02886","06882","02908","04924","02939","03929","02946","04926","02949","04929","02957","05927","02959","07909","25909","02979","07929","02986","06982","03047","04037","03057","05037","03058","05038","03069","06039","03079","07039","03159","05139","03168","08136","03179","07139","03747","04737","03758","05738","03849","04839","03879","09837","03947","04937","03949","04939","03957","05937","03958","05938","03979","07939","04059","05049","04069","06049","04157","05147","04169","06149","04196","09164","04257","05247","04269","06249","04279","07249","04296","09264","04649","08609","04759","05749","04857","05847","04869","06849","04959","05949","04969","06949","04996","09964","05069","06059","05073","07053","05079","07059","09057","25059","05157","07137","05169","06159","05179","07159","09157","05269","06259","05273","07253","05279","09257","05373","07353","05379","07359","09357","05529","25509","05879","09857","05963","06953","05973","07953","06079","07069","06179","07169","06183","08163","06273","07263","06379","07369","06429","26409","06723","26703","06729","26709","06883","08863","06998","09986","07029","25029","07057","25057","07058","25058","07083","08073","07085","25085","07093","09073","07094","09074","07099","25099","07149","09147","07183","08173","07193","09173","07194","09174","07209","25209","07239","09237","07283","08273","07293","09273","07383","08373","07394","09374","07449","09447","07494","09474","07549","09547","07583","08573","07593","09573","07594","09574","07823","27803","07905","25905","07993","09973","08058","28038","08069","46049","08079","47049","08095","09085","08193","09183","08195","09185","08293","09283","08395","09385","08493","09483","08695","09685","09626","29606","09726","29706","10035","31005","13047","14037","13057","15037","13058","15038","13059","15039","13079","17039","13149","14139","13158","15138","13159","15139","13179","17139","13197","17193","13269","36219","13649","14639","13757","15737","13758","15738","35718","13759","15739","13847","14837","13849","14839","13857","15837","13869","16839","36819","13947","14937","13969","16939","14059","15049","14069","16049","14157","15147","14159","15149","14179","17149","19147","14257","15247","14279","17249","19247","14757","15747","14759","15749","14857","15847","14979","17949","15063","16053","15069","16059","15079","19057","15163","16153","15263","16253","15279","17259","15363","16353","15539","35519","15639","35619","15838","35818","15863","16853","15879","19857","15963","16953","15969","16959","16173","17163","16179","17169","16379","17369","16430","36410","16530","36510","16739","36719","16973","17963","16998","19986","17034","37014","17083","18073","17159","19157","17194","19174","17349","19347","17394","19374","17449","19447","17559","19557","17583","18573","17594","19574","17630","37610","17994","19974","18034","38014","18093","19083","18195","19185","18293","19283","18395","19385","18430","38410","18437","35429","18493","19483","18535","38515","18593","19583","18595","19585","18635","38615","18695","19685","18735","38715","18934","38914","19034","39014","19830","39810","19835","39815","19935","39915","20049","40029","42009","20646","40626","20647","42607","20649","40629","20749","42709","20847","40827","42807","20849","40829","20946","40926","20947","40927","20949","42909","24057","25047","24069","26049","46029","24159","25149","24279","27249","24369","46329","24859","25849","25069","26059","25157","27137","25269","26259","25279","29257","25369","26359","25379","27359","29357","25969","26959","25979","27959","26179","27169","26279","27269","26749","46729","26849","46829","26949","46929","26998","29986","27159","29157","27459","29457","27541","47521","27585","28575","28195","29185","28239","45249","28295","29285","28395","29385","28495","29485","28695","29685","28741","48721","29046","49026","29047","47029","29541","49521","30315","31305","30515","31505","30519","31509","30619","31609","30715","31705","30717","31707","30719","31709","30815","31805","30819","31809","30915","31905","35058","37038","35059","37039","35061","36051","35079","37059","35158","37138","35159","37139","35169","36159","35269","36259","35369","36359","35370","37350","35958","37938","35961","36951","35979","37959","36079","37069","36171","37161","36279","37269","36471","37461","36998","39986","37081","38071","37090","39070","37190","39170","37390","39370","37481","38471","37509","39507","37581","38571","37790","39770","38095","39085","38195","39185","38391","39381","38491","39481","38495","39485","38695","39685","40227","42207","40319","41309","40417","41407","40419","41409","40427","42407","40429","42409","40527","42507","40529","42509","40617","41607","40819","41809","40917","41907","41093","43091","41427","42417","41527","42517","41529","42519","41729","42719","41827","42817","41873","43871","41929","42919","45848","46856","45948","46956","46169","48149","46171","47161","46279","47269","46281","48261","46371","47361","46479","47469","46681","48661","46881","48861","47091","49071","47109","49107","47119","49117","47181","48171","47290","49270","47309","49307","47319","49317","47381","48371","47409","49407","47419","49417","47490","49470","47581","48571","47590","49570","47990","49970","47991","49971","48091","49081","48191","49181","48291","49281","48491","49481","50013","53001","50039","53009","50058","70038","50073","70053","50178","70158","50229","52209","50319","51309","50373","70353","50413","51403","50417","51407","50419","51409","50478","70458","50513","51503","50517","51507","50529","52509","70509","50613","51603","50619","51609","50713","51703","50717","51707","50739","53709","50758","70738","50759","70739","50819","51809","50829","52809","50858","70838","50913","51903","50959","70939","50973","70953","51074","71054","51138","53118","51158","71138","51159","71139","51179","71159","51278","71258","51279","71259","51538","53518","51593","53591","51627","52617","51638","53618","51683","53681","51693","53691","51729","52719","51750","71730","51759","71739","51827","52817","51838","53818","51839","53819","51858","71838","51874","71854","51893","53891","51927","52917","51929","52919","51938","53918","51979","71959","51983","53981","52088","70088","52179","72159","52279","72259","52478","72458","52508","70508","52580","70580","52590","70590","52639","53629","52693","71683","52720","70720","52737","53727","52739","53729","52750","70750","52751","72731","52758","72738","52820","70820","52858","72838","52880","70880","52902","70902","52937","53927","52939","53929","52950","70950","52959","72939","73929","53070","75030","53159","73139","53170","75130","53279","73259","53370","73350","53379","73359","53670","75630","53859","73839","53979","73959","54753","73743","55070","77030","55071","77031","55170","77130","55970","77930","57009","59007","57081","58071","57090","59070","57091","59071","57129","59127","57191","79151","57192","79152","57219","59217","57290","59270","57292","79252","57381","58371","57390","59370","57391","59371","79351","57429","59427","57490","59470","57581","58571","57790","59770","57791","59771","57990","59970","57991","59971","57992","79952","58091","59081","58193","59183","58593","59583","58691","59681","59151","79131","59271","79251","59373","79353","59623","78613","59751","79731","59973","79953","60069","80049","60183","80163","60189","80169","60313","61303","60383","80363","60413","61403","60429","62409","60483","80463","60513","61503","60629","62609","60729","62709","60819","61809","60829","62809","60869","80849","60919","61909","60985","80965","61085","81065","61289","81269","61529","62519","61539","63519","61629","62619","61639","63619","61869","81849","61893","63891","61939","63919","61993","63991","62039","63029","62185","82165","62249","64229","62269","82249","62449","64429","62589","82569","62639","63629","62649","64629","62739","63729","62849","64829","62939","63929","62949","64929","62985","82965","63141","64131","63489","83469","63741","64731","63849","64839","63862","83842","63941","64931","63969","83949","64080","86040","64081","84061","64180","86140","64181","86141","64269","84249","64481","84461","64780","86740","64962","84942","65862","82854","66081","88041","66082","88042","66180","88140","66182","88142","66280","88240","67019","69017","67129","69127","68091","69081","68193","69183","68291","69281","68293","69283","68491","69481","68591","69581","68693","69683","68991","89961","68993","89963","70013","73001","70094","90074","70293","90273","70393","90373","70394","90374","70395","90375","70415","71405","70419","71409","70494","90474","70519","71509","70594","90574","70615","71605","70713","71703","70715","71705","70719","71709","70815","71805","70915","71905","70919","71909","71194","91174","71294","91274","71394","91374","71494","91474","71529","72519","71595","91575","71629","72619","72039","73029","72495","92475","73041","74031","73051","75031","73071","75051","73090","93070","97030","73141","74131","73149","74139","73170","75150","73190","97130","73390","93370","73481","92453","73490","93470","73590","93570","73641","74631","73649","74639","73751","75731","73890","97830","73949","74939","73951","75931","74051","75041","74059","75049","74090","94070","74091","94071","74159","75149","74190","94170","74251","75241","74390","94370","74391","94371","74490","94470","74591","94571","74751","75741","74859","75849","74891","97841","75090","95070","75091","97051","75092","97052","75190","95170","75191","95171","75192","97152","75291","95271","75392","97352","75490","95470","75590","95570","75892","97852","80013","83001","80313","81303","80415","81405","80515","81505","80613","81603","80615","81605","80713","81703","80715","81705","80813","81803","80915","81905","81135","83115","81253","85231","81335","83315","81535","83515","81735","83715","81835","83815","81853","85831","81953","85931","82035","83025","82060","86020","82806","86802","82860","86820","82906","86902","82935","83925","82960","86920","83051","85031","83061","86031","83073","85053","83151","85131","83173","85153","83282","84254","83346","86334","83641","84631","83841","84831","83861","86831","83961","86931","84051","85041","84062","86042","84074","85082","84081","86061","84082","86062","84083","86063","84174","85182","84251","85241","84261","86241","84262","86242","84274","85282","85163","86153","85261","86251","85263","86253","85361","86351","85363","86353","85863","86853","86176","87184","86276","87284","86376","87384","86476","87484","90017","97001","90026","92006","96002","90035","93005","90225","92205","90226","92206","90313","91303","90315","91305","90317","91307","90413","91403","90417","91407","90513","91503","90515","91505","90526","92506","90535","93505","90613","91603","90626","92606","90635","93605","90715","91705","90726","92706","90735","93705","90813","91803","90826","96802","90835","93805","90915","91905","90926","92906","91135","93115","91253","95231","91263","96231","91335","93315","91527","92517","91535","93515","91563","93561","91653","93651","91663","93661","91753","95731","91835","93815","91853","95831","91863","93861","91927","92917","91953","93951","92060","96020","92446","94426","92746","94726","92846","94826","92860","96820","93061","96031","93071","97031","93117","97113","93141","94131","93147","94137","93151","95131","93171","97131","93641","94631","93647","94637","93747","94737","93841","94831","93917","97913","93971","97931","94051","95041","94061","96041","94062","96042","94218","98214","94251","95241","94274","95282","94751","95741","94861","96841","94862","96842","94971","97941","95057","97037","95061","96051","95063","96053","95073","97053","95157","97137","95161","96151","95163","96153","95370","97350","95371","97351","95373","97353","95863","96853","95961","96951","95973","97953","96171","97161","96371","97361"])
    }
  },

  watch: {
    mode() {
        this.draftGuess = Array(5).fill('')
        this.selectedCellIndex = 0
        if (this.randomGoal === null) {
            let randomGoal = null
            while (randomGoal === null || this.skips.has(randomGoal.join(''))) {
                randomGoal = Math.floor(Math.random() * 100000).toString().padStart(5, '0').split('').map(Number)
            }
            this.randomGoal = {
                guess: randomGoal,
                tags: this.getTags(randomGoal)
            }
            this.randomGuesses = []
            console.log(randomGoal)
        }
        this.gameCompleted = this.guesses.length > 0 && this.guesses[this.guesses.length-1].guess.join('') === this.goal.guess.join('')
    }
  },

  methods: {
    openTutorial() {
      this.tutorialStep = 0
      this.tutorialDialog = true
    },

    closeTutorial() {
      this.tutorialDialog = false
    },

    advanceTutorial() {
      if (this.tutorialStep < 2) {
        this.tutorialStep++
      } else {
        this.closeTutorial()
      }
    },

    handleResize() {
      this.isMobile = window.innerWidth < 900
    },

    selectCell(index) {
      if (this.tutorialDialog || this.gameCompleted || this.guesses.length >= this.maxRows) return
      this.selectedCellIndex = index
    },

    pressDigit(value) {
      if (this.tutorialDialog || this.gameCompleted || this.guesses.length >= this.maxRows) return
      this.fillNextDigit(value)
    },

    clearDraftGuess() {
      this.draftGuess = Array(this.guessLength).fill('')
      this.selectedCellIndex = 0
    },

    handleGlobalKeydown(event) {
      if (this.tutorialDialog) return
      if (this.gameCompleted || this.guesses.length >= this.maxRows) return

      if (event.key === 'Enter') {
        event.preventDefault()
        this.submitGuess()
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        this.removeLatestDigit()
        return
      }

      if (/^\d$/.test(event.key)) {
        event.preventDefault()
        this.fillNextDigit(event.key)
      }
    },

    fillNextDigit(value) {
      this.$set(this.draftGuess, this.selectedCellIndex, value)
      const nextIndex = this.draftGuess.findIndex((cell, i) => i > this.selectedCellIndex && cell === '')
      if (nextIndex === -1) {
        this.selectedCellIndex = this.draftGuess.findIndex(cell => cell === '')
      } else {
        this.selectedCellIndex = nextIndex
      }
    },

    removeLatestDigit() {
      if (this.selectedCellIndex > 0 && this.draftGuess[this.selectedCellIndex] == '') {
        this.selectedCellIndex--
      }
      if (this.selectedCellIndex === -1) this.selectedCellIndex = this.draftGuess.length - 1
      this.$set(this.draftGuess, this.selectedCellIndex, '')
    },

    submitGuess() {
      if (!this.isGuessComplete || this.gameCompleted || this.draftStops.length > 0) return

      const digits = this.draftGuess.map(Number)
      const guessEntry = {
        guess: digits,
        score: null,
        tags: this.draftTags
      }
      guessEntry.score = this.scoreGuess(guessEntry.tags)
      guessEntry.tags.forEach(tag => {
        if (this.goal.tags.includes(tag)) {
          this.knownTrueTags.add(tag)
        } else {
          this.knownFalseTags.add(tag)
        }
      })

      this.guesses.push(guessEntry)
      this.draftGuess = Array(this.guessLength).fill('')
      this.selectedCellIndex = 0

      if (digits.join('') === this.goal.guess.join('')) {
        this.gameCompleted = true
        this.winDialog = true
      }
      if (this.mode === 0) {
        localStorage.setItem("goal", JSON.stringify(this.dailyGoal))
        localStorage.setItem("guesses", JSON.stringify(this.guesses))
      }
    //   Nerdle bot
    //   let available = Object.entries(this.tagMap).filter(entry => {
    //     let pass = true
    //     if ([...this.knownTrueTags].some(t => !entry[0].split(",").includes(t))) pass = false
    //     if (entry[0].split(",").some(t => this.knownFalseTags.has(t))) pass = false
    //     return pass
    //   })
    //   console.log(available.length, available.toSorted((b,a) => b[0].length - a[0].length)[0][1])
    },

    scoreGuess(tags) {
        const goalTags = new Set(this.goal.tags)
        const sharedTags = tags.filter(tag => goalTags.has(tag))
        return sharedTags.length / this.goal.tags.length
    },

    getStats(guess) {
        const stats = {}
        stats.wholeNumber = parseInt(guess.join(''), 10)

        stats.guessSum = guess.reduce((sum, digit) => sum + digit, 0)
        stats.guessProduct = guess.reduce((product, digit) => product * digit, 1)

        const primeFactors = []
        let divisor = 2
        let n = stats.wholeNumber
        while (n > 1) {
            if (n % divisor === 0) {
                primeFactors.push(divisor)
                n /= divisor
            } else {
                divisor++
            }
        }
        stats.primeFactors = primeFactors
        return stats
    },

    isPerfectSquare(num) {
      return Math.sqrt(num) % 1 === 0
    },

    getTags(guess) {
        const tags = []
        const stats = this.getStats(guess)
        const wholeNumber = stats.wholeNumber
        const guessSum = stats.guessSum
        const guessProduct = stats.guessProduct
        const primeFactors = stats.primeFactors

        tags.push(`sum${guessSum}`)

        const factors19 = []
        for (let i = 1; i <= 9; i++) {
            if (wholeNumber % i === 0) factors19.push(i)
        }
        
        const counts = {}
        let maxStreaks = { up: 1, down: 1, same: 1 }
        let currentStreaks = { up: 1, down: 1, same: 1 }
        let differences = []
        let diff;
        guess.forEach((digit, i) => {
            counts[digit] = (counts[digit] || 0) + 1
            if (i > 0) {
                switch (true) {
                    case guess[i] === guess[i - 1]+1:
                        currentStreaks.up++
                        currentStreaks.down = 1
                        currentStreaks.same = 1
                        maxStreaks.up = Math.max(maxStreaks.up, currentStreaks.up)
                        break
                    case guess[i] === guess[i - 1]-1:
                        currentStreaks.down++
                        currentStreaks.up = 1
                        currentStreaks.same = 1
                        maxStreaks.down = Math.max(maxStreaks.down, currentStreaks.down)
                        break
                    case guess[i] === guess[i - 1]:
                        currentStreaks.same++
                        currentStreaks.up = 1
                        currentStreaks.down = 1
                        maxStreaks.same = Math.max(maxStreaks.same, currentStreaks.same)
                        break
                    default:
                        currentStreaks.up = 1
                        currentStreaks.down = 1
                        currentStreaks.same = 1
                }
                diff = guess[i] - guess[i - 1]
                differences.push(
                    diff === 0 ? 'same' : diff > 0 ? 'up' : 'down'
                )
            }
        })
        let maxCount = Math.max(...Object.values(counts))

        if (wholeNumber % 2 === 0) tags.push('even')
        else tags.push('odd')
        if (guess.toSorted().toString() === guess.toString()) tags.push('non_decreasing')
        if (guess.toSorted((a, b) => b - a).toString() === guess.toString()) tags.push('non_increasing')
        if (tags.includes('non_decreasing') && new Set(guess).size === guess.length) tags.push('increasing')
        if (tags.includes('non_increasing') && new Set(guess).size === guess.length) tags.push('decreasing')
        if (this.isPerfectSquare(wholeNumber)) tags.push('square')
        if (Math.cbrt(wholeNumber) % 1 === 0) tags.push('cube')
        if (primeFactors.length === 1 && primeFactors[0] === wholeNumber && wholeNumber > 1) tags.push('prime')
        if (this.isPerfectSquare(5 * wholeNumber * wholeNumber + 4) || this.isPerfectSquare(5 * wholeNumber * wholeNumber - 4)) tags.push('fibonacci')
        if (maxCount == 2) tags.push('pair')
        if (maxCount == 3) tags.push('triple')
        if (maxCount == 4) tags.push('quadruple')
        if (maxCount == 5) tags.push('quintuple')
        if (maxStreaks.same == 2) tags.push('pair_seq')
        if (maxStreaks.same == 3) tags.push('triple_seq')
        if (maxStreaks.same == 4) tags.push('quadruple_seq')
        if (maxStreaks.same == 5) tags.push('quintuple_seq')
        if (guess.join('') === guess.slice().reverse().join('')) tags.push('palindrome')
        if (maxStreaks.up == 2) tags.push('increasing_pair')
        if (maxStreaks.down == 2) tags.push('decreasing_pair')
        if (maxStreaks.up == 3) tags.push('increasing_triple')
        if (maxStreaks.down == 3) tags.push('decreasing_triple')
        if (maxStreaks.up == 4) tags.push('increasing_quadruple')
        if (maxStreaks.down == 4) tags.push('decreasing_quadruple')
        if (maxStreaks.up == 5) tags.push('increasing_quintuple')
        if (maxStreaks.down == 5) tags.push('decreasing_quintuple')
        if (wholeNumber % guessSum === 0) tags.push('harshad')
        if (new Set(primeFactors).size === primeFactors.length) tags.push('squarefree')
        if ((Math.sqrt(8 * wholeNumber + 1) - 1) / 2 % 1 === 0) tags.push('triangular')
        if (new Set(guess).size === guess.length) tags.push('heterogeneous')
        if (guessSum % 2 === 0) tags.push('sum_even')
        else tags.push('sum_odd')
        if (guessProduct % 2 === 0) tags.push('product_even')
        else tags.push('product_odd')
        if (guess.every(digit => digit !== 0 && wholeNumber % digit === 0)) tags.push('self_dividing')
        if (differences.join('') == 'upupdowndown') tags.push('mountain')
        if (differences.join('') == 'downdownupup') tags.push('valley')
        if (differences.join('') == 'updownupdown') tags.push('zigzag')
        if (differences.join('') == 'downupdownup') tags.push('zagzig')
        if (wholeNumber >= 50000) tags.push('greater_50000')
        else tags.push('less_50000')
        if (wholeNumber % 1000 >= 500) tags.push('round_up')
        else tags.push('round_down')
        if (guess[0] + guess[1] === guess[3] + guess[4]) tags.push('balanced')
        else if (guess[0] + guess[1] > guess[3] + guess[4]) tags.push('front_heavy')
        else tags.push('back_heavy')
        if (guess[0] * guess[1] === parseInt(`${guess[3]}${guess[4]}`, 10)) tags.push('product')
        if (guess.every(digit => digit <= 4)) tags.push('diminutive')
        if (guess.every(digit => digit >= 5)) tags.push('ginormous')
        if (guess[0] < guess[4]) tags.push('rising')
        else if (guess[0] > guess[4]) tags.push('falling')
        if (guess[0] % 2 === 0 && guess[4] % 2 === 0) tags.push('outside_even')
        else if (guess[0] % 2 !== 0 && guess[4] % 2 !== 0) tags.push('outside_odd')
        if (guess[0] < guess[1]) tags.push('upstart')
        else if (guess[0] > guess[1]) tags.push('downstart')
        if (guess[3] < guess[4]) tags.push('upend')
        else if (guess[3] > guess[4]) tags.push('downend')

        diff = Math.max(...guess) - Math.min(...guess)
        tags.push(`difference${diff}`)

        tags.push(`core${guess[2]}`)

        let primeSum = guess.filter(digit => [2, 3, 5, 7].includes(digit)).reduce((sum, digit) => sum + digit, 0)
        tags.push(`prime_sum${primeSum}`)

        for (let i = 3; i <= 9; i++) {
            if (wholeNumber % i === 0) tags.push(`multiple${i}`)
        }
        const evenCount = guess.filter(digit => digit % 2 === 0).length
        const oddCount = guess.filter(digit => digit % 2 !== 0).length
        for (let i = 0; i <= 5; i++) {
            if (evenCount === i) tags.push(`even${i}`)
            if (oddCount === i) tags.push(`odd${i}`)
        }
        var copy = false
        for (let i = 0; i < 4; i++) {
            for (let j = i + 2; j < 4; j++) {
                if (`${guess[i]}${guess[i + 1]}` === `${guess[j]}${guess[j + 1]}`) {
                    copy = true
                    break
                }
            }
        }
        if (copy) tags.push('copycat')
        return tags
    },

    isGoalTag(tag) {
      return this.goal.tags.includes(tag)
    },

    getTagLabel(tag) {
      return this.descriptions[tag].title
    },

    getTagDescription(tag) {
      return this.descriptions[tag].description
    }
  },
  computed: {
    goal() {
        return this.mode === 0 ? this.dailyGoal : this.randomGoal
    },

    guesses() {
        return this.mode === 0 ? this.dailyGuesses : this.randomGuesses
    },

    knownFalseTags() {
        return this.mode === 0 ? this.dailyKnownFalseTags : this.randomKnownFalseTags
    },

    knownTrueTags() {
        return this.mode === 0 ? this.dailyKnownTrueTags : this.randomKnownTrueTags
    },

    isGuessComplete() {
      return this.draftGuess.every(value => value !== '')
    },

    goalGuessText() {
      return this.goal ? this.goal.guess.join('') : ''
    },

    mobileDigits() {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
    },

    draftTags() {
      return this.draftGuess.includes('') ? [] : this.getTags(this.draftGuess.map(Number))
    },

    draftStops() {
        if (this.draftGuess.includes('')) return []
        return this.draftTags.filter(tag => this.knownFalseTags.has(tag)).concat(
            [...this.knownTrueTags].filter(tag => !this.draftTags.includes(tag))
        )
    },

    tagsToShow() {
        const out = []
        this.guesses.forEach(guess => {
            guess.tags.forEach(tag => {
                if (!out.includes(tag)) out.push(tag)
            })
            out.push("divider")
        })
        return out.slice(0, -1)
    },

    rows() {
      const rows = this.guesses.map((guess, index) => ({
        submitted: true,
        cells: guess.guess,
        score: guess.score,
        index
      }))

      if (this.guesses.length < this.maxRows) {
        rows.push({
          submitted: false,
          cells: this.draftGuess,
          score: 0,
          index: rows.length
        })
      }

      return rows
    },

    descriptions() {
        let descriptions = {
            even: {
                title: 'Even',
                description: 'A factor of 2.'
            },
            odd: {
                title: 'Odd',
                description: 'Not a factor of 2.'
            },
            increasing: {
                title: 'Strictly Increasing',
                description: 'Each digit is strictly greater than the previous one.'
            },
            decreasing: {
                title: 'Strictly Decreasing',
                description: 'Each digit is strictly less than the previous one.'
            },
            square: {
                title: 'Perfect Square',
                description: 'A perfect square number.'
            },
            cube: {
                title: 'Perfect Cube',
                description: 'A perfect cube number.'
            },
            prime: {
                title: 'Prime',
                description: 'A prime number.'
            },
            fibonacci: {
                title: 'Fibonacci',
                description: 'A number in the Fibonacci sequence.'
            },
            pair: {
                title: 'Pair',
                description: 'Has at least one set of exactly two identical digits.'
            },
            triple: {
                title: 'Triple',
                description: 'Has exactly three identical digits.'
            },
            quadruple: {
                title: 'Quadruple',
                description: 'Has exactly four identical digits.'
            },
            quintuple: {
                title: 'Quintuple',
                description: 'Has exactly five identical digits.'
            },
            pair_seq: {
                title: 'Sequential Pair',
                description: 'Has at least one set of two identical digits in a row.'
            },
            triple_seq: {
                title: 'Sequential Triple',
                description: 'Has exactly three identical digits in a row.'
            },
            quadruple_seq: {
                title: 'Sequential Quadruple',
                description: 'Has exactly four identical digits in a row.'
            },
            quintuple_seq: {
                title: 'Sequential Quintuple',
                description: 'Has exactly five identical digits in a row.'
            },
            palindrome: {
                title: 'Palindrome',
                description: 'Reads the same forwards and backwards.'
            },
            increasing_pair: {
                title: 'Increasing Pair',
                description: 'Has at least on set of two neighboring digits in increasing order.'
            },
            decreasing_pair: {
                title: 'Decreasing Pair',
                description: 'Has at least on set of two neighboring digits in decreasing order.'
            },
            increasing_triple: {
                title: 'Increasing Triple',
                description: 'Has exactly three neighboring digits in increasing order.'
            },
            decreasing_triple: {
                title: 'Decreasing Triple',
                description: 'Has exactly three neighboring digits in decreasing order.'
            },
            increasing_quadruple: {
                title: 'Increasing Quadruple',
                description: 'Has exactly four neighboring digits in increasing order.'
            },
            decreasing_quadruple: {
                title: 'Decreasing Quadruple',
                description: 'Has exactly four neighboring digits in decreasing order.'
            },
            increasing_quintuple: {
                title: 'Increasing Quintuple',
                description: 'Has exactly five neighboring digits in increasing order.'
            },
            decreasing_quintuple: {
                title: 'Decreasing Quintuple',
                description: 'Has exactly five neighboring digits in decreasing order.'
            },
            non_increasing: {
                title: 'Non-Increasing',
                description: 'Each digit is less than or equal to the previous one.'
            },
            non_decreasing: {
                title: 'Non-Decreasing',
                description: 'Each digit is greater than or equal to the previous one.'
            },
            harshad: {
                title: 'Harshad Number',
                description: 'A number that is divisible by the sum of its digits.'
            },
            squarefree: {
                title: 'Square-Free',
                description: 'A number that is not divisible by any perfect square other than 1.'
            },
            triangular: {
                title: 'Triangular Number',
                description: 'A number that can form an equilateral triangle.'
            },
            heterogeneous: {
                title: 'Heterogeneous',
                description: 'The number uses all unique digits.'
            },
            sum_even: {
                title: 'Sum Even',
                description: 'The sum of the digits is even.'
            },
            sum_odd: {
                title: 'Sum Odd',
                description: 'The sum of the digits is odd.'
            },
            product_even: {
                title: 'Product Even',
                description: 'The product of the digits is even.'
            },
            product_odd: {
                title: 'Product Odd',
                description: 'The product of the digits is odd.'
            },
            self_dividing: {
                title: 'Self-Dividing',
                description: 'A number that is divisible by each of its digits.'
            },
            mountain: {
                title: 'Mountain',
                description: 'Digits increase to the center and then decrease.'
            },
            valley: {
                title: 'Valley',
                description: 'Digits decrease to the center and then increase.'
            },
            zigzag: {
                title: 'Zigzag',
                description: 'Digits alternate between increasing and decreasing, starting with an increase.'
            },
            zagzig: {
                title: 'Zagzig',
                description: 'Digits alternate between decreasing and increasing, starting with a decrease.'
            },
            greater_50000: {
                title: '>= 50,000',
                description: 'The number is greater than or equal to 50,000.'
            },
            less_50000: {
                title: '< 50,000',
                description: 'The number is less than 50,000.'
            },
            round_up: {
                title: 'Rounds Up',
                description: 'The number rounds up to the nearest thousand.'
            },
            round_down: {
                title: 'Rounds Down',
                description: 'The number rounds down to the nearest thousand.'
            },
            balanced: {
                title: 'Balanced',
                description: 'The sum of the first two digits equals the sum of the last two digits.'
            },
            product: {
                title: 'Product',
                description: 'The product of the first two digits equals the last two digits.'
            },
            diminutive: {
                title: 'Diminutive',
                description: 'The number uses only digits 0-4.'
            },
            ginormous: {
                title: 'Ginormous',
                description: 'The number uses only digits 5-9.'
            },
            copycat: {
                title: 'Copycat',
                description: 'The number has a repeated pattern of two digits.'
            },
            front_heavy: {
                title: 'Front Heavy',
                description: 'The sum of the first two digits is greater than the sum of the last two digits.'
            },
            back_heavy: {
                title: 'Back Heavy',
                description: 'The sum of the first two digits is less than the sum of the last two digits.'
            },
            rising: {
                title: 'Rising',
                description: 'The last digit is greater than the first digit.'
            },
            falling: {
                title: 'Falling',
                description: 'The last digit is less than the first digit.'
            },
            outside_even: {
                title: 'Outside Even',
                description: 'The first and last digits are both even.'
            },
            outside_odd: {
                title: 'Outside Odd',
                description: 'The first and last digits are both odd.'
            },
            upstart: {
                title: 'Upstart',
                description: 'The second digit is greater than the first digit.'
            },
            downstart: {
                title: 'Downstart',
                description: 'The second digit is less than the first digit.'
            },
            upend: {
                title: 'Upend',
                description: 'The last digit is greater than the second-to-last digit.'
            },
            downend: {
                title: 'Downend',
                description: 'The last digit is less than the second-to-last digit.'
            }
        }

        for (let i = 0; i <= 9; i++) {
            if (i >= 3) {
                descriptions[`multiple${i}`] = {
                    title: `Multiple of ${i}`,
                    description: `An exact multiple of ${i}.`
                }
            }
            descriptions[`difference${i}`] = {
                title: `Difference ${i}`,
                description: `The difference between the largest and smallest digits is ${i}.`
            }
            descriptions[`core${i}`] = {
                title: `Core ${i}`,
                description: `The middle number is a ${i}.`
            }
        }
        for (let i = 0; i <= 5; i++) {
            descriptions[`even${i}`] = {
                title: `${i} Even${i !== 1 ? 's' : ''}`,
                description: `Has ${i} even digit${i !== 1 ? 's' : ''}.`
            }
            descriptions[`odd${i}`] = {
                title: `${i} Odd${i !== 1 ? 's' : ''}`,
                description: `Has ${i} odd digit${i !== 1 ? 's' : ''}.`
            }
        }
        for (let i = 0; i <= 9*5; i++) {
            descriptions[`sum${i}`] = {
                title: `Sum ${i}`,
                description: `The sum of the digits is ${i}.`
            }
            if (i <= 7*5) {
                descriptions[`prime_sum${i}`] = {
                    title: `Prime Sum ${i}`,
                    description: `The sum of the prime digits is ${i}.`
                }
            }
        }
        return descriptions
    }
  }
}
</script>

<style scoped>
button {
  touch-action: manipulation;
}

.app-shell {
  min-height: 100vh;
  background: linear-gradient(135deg, #131817 0%, #070807 100%);
}

.game-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 20px;
  background: rgba(26, 29, 27, 0.88);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  width: 75%;
}

.board-area {
  flex: 1;
}

.guess-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.guess-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.guess-cells {
  display: flex;
  flex: 1;
  justify-content: center;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 10vw;
  height: 10vw;
  font-size: 5vw;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-right: 0;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.35);
  padding: 0;
  cursor: default;
}

.cell:last-child {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.input-cell {
  text-align: center;
  outline: none;
  background: rgba(255, 255, 255, 0.04);
  color: #f5f7fa;
}

.cell.selected {
  border-color: rgba(76, 175, 80, 0.4);
  box-shadow: inset 0 0 0 1px rgba(76, 175, 80, 0.25);
}

.input-cell {
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  font-family: inherit;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border-radius: 0;
  box-shadow: none !important;
  background: rgba(255, 255, 255, 0.04) !important;
  color: #f5f7fa !important;
}

.input-cell:hover {
  background: rgba(255, 255, 255, 0.06) !important;
}

.filled {
  background: linear-gradient(145deg, #23452a, #2d5346);
  color: #f5f7fa;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.feedback-shell {
  align-items: center;
  justify-content: center;
  position: fixed;
  right: 2vw;
  height: min(9vw, 44px);
  width: min(9vw, 44px);
}

.progress-label {
  font-size: 0.7rem;
  font-weight: 700;
}

.tag-panel {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 6px 0 0;
  padding: 0;
  margin-right: 40px;
  transition: opacity 0.16s ease;
}

.tag-chip-wrap {
  display: inline-flex;
}

.celebration-card {
  border: 2px solid rgba(91, 255, 96, 0.25);
}

.tutorial-card {
  border: 1px solid rgba(76, 175, 80, 0.25);
  border-radius: 18px;
  overflow: hidden;
}

.tutorial-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
}

.tutorial-close {
  opacity: 0.85;
}

.tutorial-body {
  padding-top: 12px;
}

.tutorial-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tutorial-eyebrow {
  color: #76c07a;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.tutorial-copy {
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.6;
  margin: 0;
}

.tutorial-visual-card {
  margin-top: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  padding: 16px;
  text-align: center;
}

.tag-sample {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.spacer {
  width: 64px;
}

.answer-pill {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(76, 175, 80, 0.16);
  color: #a5d6a7;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.tag-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.action-lock-btn {
  min-width: 92px;
  border-radius: 999px;
}

.mobile-keypad {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mobile-keypad-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.mobile-keypad-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.mobile-keypad-btn {
  border: 0;
  border-radius: 12px;
  font-size: 1.5rem;
  font-weight: 700;
  min-width: revert !important;
}

.mobile-action-bar {
  position: sticky;
  bottom: 10px;
  z-index: 4;
  background: rgba(7, 8, 7, 0.95);
}

@media (max-width: 1000px) {
  .game-card {
    width: min(100%, 100%);
    padding: 14px 12px 18px;
    border-radius: 16px;
  }

  .guess-row {
    gap: 6px;
  }

  .guess-cells {
    gap: 4px;
  }

  .cell {
    width: min(14vw, 56px);
    height: min(14vw, 56px);
    font-size: clamp(1rem, 4.6vw, 1.6rem);
  }

  .feedback-shell {
    min-width: 48px;
  }

  .tag-panel {
    margin-right: 0;
    justify-content: flex-start;
  }
}

@media (max-width: 700px) {
  .game-card {
    padding: 12px 10px 16px;
  }

  .guess-row {
    flex-direction: column;
    align-items: stretch;
  }

  .feedback-shell {
    justify-content: center;
    min-width: auto;
    margin-top: 4px;
  }

  .tag-panel {
    justify-content: center;
  }
}
</style>