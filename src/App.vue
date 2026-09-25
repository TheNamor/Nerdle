<template>
  <v-app dark>
    <v-alert
      v-if="newUpdate"
      class="session-update-notification"
      color="orange darken-3"
      dark
      dense
      dismissible
      elevation="8"
      @input="newUpdate = $event"
    >
      A new Nerdle update is available. Refresh the page and log back in to save your progress.
      <v-btn text rounded outlined small class="ml-2" @click="refreshAfterUpdate">Refresh and log in</v-btn>
    </v-alert>

    <v-btn
      class="auth-launcher"
      icon
      color="green lighten-2"
      title="Account"
      @click="authVisible = true"
    >
      <v-icon>{{ email ? 'mdi-account-check-outline' : 'mdi-account-outline' }}</v-icon>
    </v-btn>

    <v-dialog
      v-model="authVisible"
      max-width="440px"
      :fullscreen="$vuetify.breakpoint.xsOnly"
    >
      <login
        :email="email"
        :authenticated="Boolean(token)"
        :counts="counts"
        :completed-puzzles="completedPuzzles"
        @authenticated="handleAuthenticated"
        @logout="handleLogout"
        @close="authVisible = false"
      />
    </v-dialog>

    <v-dialog v-model="archiveDialog" max-width="360px" :fullscreen="$vuetify.breakpoint.xsOnly">
      <v-card color="rgba(18, 24, 20, 0.98)" dark>
        <v-card-title class="text-h6">Nerdle archive</v-card-title>
        <v-card-text>
          <v-date-picker
            v-model="archiveDay"
            :max="yesterday"
            :events="completedPuzzles"
            event-color="green"
            color="purple"
            full-width
            @change="selectArchiveDay"
          />
        </v-card-text>
        <v-card-actions class="justify-space-between">
          <v-btn v-if="!token" text small color="green lighten-2" outlined @click="openArchiveLogin">
            Log in to save your progress
          </v-btn>
          <v-spacer v-else></v-spacer>
          <v-btn text color="grey lighten-2" @click="archiveDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
                    <v-btn color="purple" :class="{'white--text': mode == 2}" rounded x-small @click="archiveDialog = true">Archive</v-btn>
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
                          <div
                            v-for="(cell, colIndex) in row.cells"
                            :key="`${rowIndex}-${colIndex}`"
                            @click="selectedCellIndex = colIndex"
                            class="cell input-cell"
                            :class="{ active: colIndex === 0 || row.cells.some(value => value !== ''), selected: colIndex === selectedCellIndex }"
                            tabindex="-1"
                          >
                            <div v-if="cell !== ''" class="cell-digit">{{ cell }}</div>
                            <div v-else class="notes-grid">
                              <span
                                v-for="i in 10"
                                :key="i-1"
                                class="note"
                                v-show="draftNotes[colIndex] && draftNotes[colIndex][i-1]"
                                :style="getNoteStyle(i-1)"
                              >{{ i-1 }}</span>
                            </div>
                          </div>
                        </template>
                      </div>

                    <div v-if="row.submitted" class="feedback-shell">
                      <v-progress-circular
                        :value="row.score[0]/row.score[1] * 100"
                        color="green"
                        rotate="-90"
                      >
                        <span class="progress-label">{{ Math.round(row.score[0]/row.score[1] * 100) }}%</span>
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
                <v-btn x-small outlined color="green" @click="openTutorial">How to Play</v-btn>
                <div class="text-caption grey--text text--lighten-1">Guess {{ guesses.length+(gameCompleted ? 0 : 1) }} of {{ maxRows }}</div>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="30" height="30"
                  v-if="guesses.length === 0"
                  @click="fillRandomGuess"
                  style="cursor: pointer;"
                ><title>Random Guess</title><path fill="white" :d="randomIcon"></path></svg>
                <v-btn
                  v-else-if="mode === 1 && gameCompleted"
                  small
                  color="blue"
                  @click="initializeRandomPuzzle"
                  icon
                  title="New Puzzle"
                ><v-icon>mdi-refresh</v-icon></v-btn>
                <v-btn
                  v-if="guesses.length > 0 && !gameCompleted"
                  small
                  :color="notesMode ? 'green' : 'grey'"
                  @click="notesMode = !notesMode"
                  icon
                  title="Notes"
                ><v-icon>mdi-pencil</v-icon></v-btn>
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
              The goal is to discover the target five-digit number by making guesses that get progressively closer.
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
            <div style="display: flex; align-items: center;" v-if="tutorialStep === 2 && guesses.length === 0">
              Try using &nbsp;
              <svg 
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="30" height="30"
              ><path fill="white" :d="randomIcon"></path></svg>
            </div>
            <span v-else-if="tutorialStep === 2 && guesses.length > 0">Good luck!</span>
            <v-icon v-else-if="tutorialStep !== 2">mdi-arrow-right-bold</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="winDialog" max-width="50vw" :fullscreen="$vuetify.breakpoint.xsOnly" persistent>
      <v-snackbar v-model="copied" :timeout="2000" color="success" text dark>Copied to clipboard!</v-snackbar>
      <v-card class="celebration-card" color="rgba(18, 24, 20, 0.98)" :dark="true">
        <v-card-title class="justify-center text-h5 green--text" style="word-break: normal !important; text-align: center;">{{ guesses.length <= 5 ? celebrations[guesses.length] : "It's ok... you'll do better next time!" }}</v-card-title>
        <v-card-text class="text-center">
          <div class="text-h6 green--text">You found the answer in {{ guesses.length }} guess{{ guesses.length === 1 ? '' : 'es' }}.</div>
          <div class="mb-3">
            <div class="font-weight-bold mb-1">Answer</div>
            <div class="answer-pill">{{ goalGuessText }}</div>
          </div>
          <div>
            <div class="font-weight-bold mb-2">Share</div>
            <div class="tutorial-visual-card share-card">
              <pre class="share-pre">{{ shareText }}</pre>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="justify-center pb-4">
          <v-btn small rounded color="blue" @click="copyShare">Copy</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="blue" dark @click="winDialog = false" text rounded outlined>Nice!</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import seedrandom from 'seedrandom'
import example from "./assets/example.png"
import tagMap from '@/assets/tagMap.json'
import { getSummary, savePuzzle, getPuzzle } from '@/data'
import Login from '@/components/Login.vue'

export default {
  components: {
    Login
  },

  async mounted() {
    document.title = 'Nerdle'
    this.token = localStorage.getItem('nerdle_token') || ''
    this.email = localStorage.getItem('email') || ''
    this.authVisible = !this.token
    await this.getSummary()
    this.handleResize()
    window.addEventListener('keydown', this.handleGlobalKeydown)
    window.addEventListener('resize', this.handleResize)
    const today = this.getDateString(new Date())
    let dailyGoal = this.generateSeededGoal(today)
    this.day = this.today = today
    let savedGoal = JSON.parse(localStorage.getItem("puzzle"))
    if ((!savedGoal || savedGoal.day !== today) && this.token) {
      savedGoal = await getPuzzle(this.token, today)
      if (savedGoal.ok && savedGoal.data) {
        savedGoal = savedGoal.data
      } else if (savedGoal.status === 401) {
        this.handleLogout()
        this.newUpdate = true
        savedGoal = null
      } else {
        savedGoal = null
      }
    }
    if (savedGoal !== null && savedGoal.day === today) {
        this.loadPuzzle(savedGoal)
    } else {
      this.dailyGoal = dailyGoal
    }
    
    console.log(today, dailyGoal)
    // Find dupes
    // let startTime = performance.now()
    this.tagMap = Object.fromEntries(Object.entries(tagMap).map(([num, tags]) => [num, new Set(tags)]))
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
    // let overlaps = {}
    // console.log(this.skips.size)
    // Object.entries(this.tagMap).forEach(([num, tags]) => {
    //   num = num.padStart(5, '0')
    //   if (this.skips.has(num)) {
    //     return
    //   }
    //   let without = Array.from(tags).filter(tag => tag != 'harshad')
    //   without.sort()
    //   const tagKey = without.join(',')
    //   if (!overlaps[tagKey]) {
    //     overlaps[tagKey] = []
    //   }
    //   overlaps[tagKey].push(num)
    // })
    // let dupes = Object.values(overlaps).filter(arr => arr.length > 1)
    // console.log('Numbers that share tags: ', dupes.flat().length)
    // console.log(dupes.flat())
    // let ind = Math.floor(Math.random() * dupes.length)
    // console.log('Sample', dupes.slice(ind, ind + 10))
    // console.log('Time taken to generate tag map: ', performance.now() - startTime, 'ms')
    // console.log(dupes.flat().map(num => num.join('')))
    // Nerdle bot
    // this.tagMap = {}
    // for (let i = 0; i < 100000; i++) {
    //     let guess = i.toString().padStart(5, '0').split('').map(Number)
    //     let tags = this.getTags(guess)
    //     this.tagMap[i] = tags
    // }
    // console.log("tags mapped")
    // console.log(Object.entries(this.tagMap).toSorted((b,a) => b[0].length - a[0].length)[0][1])
    // const a = document.createElement("a");
    // a.href = URL.createObjectURL(new Blob([JSON.stringify(this.tagMap, null, 2)], {
    //   type: "text/plain"
    // }));
    // a.setAttribute("download", "data.txt");
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);
  },

  beforeDestroy() {
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    window.removeEventListener('resize', this.handleResize)
  },

  data() {
    return {
      tagMap: {},
      authVisible: false,
      token: '',
      email: '',
      mode: 0,
      example: example,
      isMobile: false,
      guessLength: 5,
      maxRows: 5,
      draftGuess: Array(5).fill(''),
      draftNotes: Array(5).fill(null).map(() => Array(10).fill(false)),
      notesMode: false,
      selectedCellIndex: 0,
      dailyKnownFalseTags: new Set(),
      dailyKnownTrueTags: new Set(),
      randomKnownFalseTags: new Set(),
      randomKnownTrueTags: new Set(),
      archiveDay: null,
      archiveGoal: null,
      archiveGuesses: [],
      archiveKnownFalseTags: new Set(),
      archiveKnownTrueTags: new Set(),
      archiveDialog: false,
      archiveLoading: false,
      day: null,
      today: null,
      dailyGoal: null,
      randomGoal: null,
      dailyGuesses: [],
      randomGuesses: [],
      gameCompleted: false,
      winDialog: false,
      tutorialDialog: false,
      copied: false,
      newUpdate: false,
      completedPuzzles: [],
      counts: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0},
      tutorialStep: 0,
      celebrations: {
        1: "Lucky duck! You got it on the first try!",
        2: "Wowza! You spotted the answer!",
        3: "Yippee! You solved it!",
        4: "Nice! That was a tricky one!",
        5: "Impressive! It's hard to get all the way to 5 guesses!",
      },
      skips: new Set(["01473","03471","01493","03491","01563","03561","01893","03891","02046","04026","02049","04029","02057","05027","02059","05029","02068","06028","02069","06029","02169","26109","02535","03525","02539","03529","02554","05542","02635","03625","02637","03627","02649","04629","24609","02735","03725","02739","03729","02746","04726","02747","04727","24707","02749","04729","24709","02757","05727","02759","05729","25709","02808","04824","02846","04826","02847","04827","24807","02857","05827","02859","05829","02868","06828","02869","26809","02886","06882","02908","04924","02935","03925","02939","03929","02946","04926","02949","04929","24909","02957","05927","02959","07909","25909","02979","07929","02986","06982","03047","04037","03057","05037","03058","05038","03069","06039","03079","07039","03097","07093","09073","03159","05139","03168","08136","03179","07139","03747","04737","03758","05738","03849","04839","03879","09837","03887","08873","03947","04937","03949","04939","03957","05937","03958","05938","03979","07939","04059","05049","04069","06049","04157","05147","04169","06149","04196","09164","04257","05247","04269","06249","04279","07249","04296","09264","04649","08609","04759","05749","04857","05847","04869","06849","04959","05949","04969","06949","04996","09964","05069","06059","05073","07053","05079","07059","09057","25059","05157","07137","05169","06159","05179","07159","09157","05263","06253","05269","06259","05273","07253","05279","09257","05373","07353","05379","07359","09357","05529","25509","05879","09857","05963","06953","05973","07953","06079","07069","06179","07169","06183","08163","06273","07263","06379","07369","06429","26409","06723","26703","06729","26709","06883","08863","06929","26909","06998","09986","07029","25029","07057","25057","07058","25058","07083","08073","07085","08075","25085","07094","09074","07095","09075","07099","25099","07149","09147","07183","08173","07185","08175","07193","09173","07194","09174","07195","09175","07208","25208","07209","25209","07239","09237","07283","08273","07285","08275","07293","09273","07383","08373","07394","09374","07395","09375","07449","09447","07485","08475","07494","09474","07495","09475","07549","09547","07583","08573","07593","09573","07594","09574","07794","09774","07795","09775","07823","27803","07905","25905","07993","09973","08058","28038","08069","46049","08079","47049","08095","09085","08193","09183","08195","09185","08293","09283","08395","09385","08425","28405","08493","09483","08525","28505","08595","09585","08625","28605","08695","09685","08725","28705","09425","29405","09426","29406","09526","29506","09626","29606","09725","29705","09726","29706","09825","29805","09925","29905","10035","31005","13047","14037","13057","15037","13058","15038","13059","15039","13079","17039","13149","14139","13158","15138","13159","15139","13179","17139","13197","17193","13269","36219","13649","14639","13749","14739","13757","15737","13758","15738","35718","13759","15739","13847","14837","13849","14839","13857","15837","13858","15838","35818","13869","16839","36819","13887","18873","13947","14937","13959","35919","13969","16939","14059","15049","14069","16049","14079","17049","14157","15147","14159","15149","14179","17149","19147","14257","15247","14279","17249","19247","14757","15747","14759","15749","14857","15847","14859","15849","14979","17949","15063","16053","15069","16059","15079","19057","15163","16153","15263","16253","15279","17259","15363","16353","15539","35519","15639","35619","15863","16853","15879","19857","15938","35918","15957","17937","15963","16953","15969","16959","16173","17163","16179","17169","16379","17369","16430","36410","16473","17463","16479","17469","16530","36510","16739","36719","16973","17963","16998","19986","17034","37014","17083","18073","17085","18075","17159","19157","17194","19174","17195","19175","17285","18275","17294","19274","17295","19275","17349","19347","17394","19374","17449","19447","17485","18475","17495","19475","17559","19557","17583","18573","17585","18575","17594","19574","17595","19575","17630","37610","17994","19974","17995","19975","18034","38014","18093","19083","18195","19185","18293","19283","18395","19385","18430","38410","18437","35429","18493","19483","18495","19485","18535","38515","18593","19583","18595","19585","18635","38615","18657","37629","18695","19685","18735","38715","18934","38914","19034","39014","19735","39715","19830","39810","19835","39815","19935","39915","20049","40029","42009","20646","40626","20647","42607","20649","40629","20749","42709","20847","40827","42807","20849","40829","20946","40926","20947","40927","20949","42909","24057","25047","24069","26049","46029","24079","27049","24159","25149","24279","27249","24369","46329","24859","25849","24957","25947","25069","26059","25157","27137","25269","26259","25279","29257","25369","26359","25379","27359","29357","25969","26959","25979","27959","26179","27169","26279","27269","26379","27369","26749","46729","26849","46829","26949","46929","26979","27969","26998","29986","27085","28075","27095","29075","27159","29157","27285","28275","27295","29275","27385","28375","27395","29375","27459","29457","27485","28475","27541","47521","27585","28575","27795","29775","27995","29975","28195","29185","28239","45249","28295","29285","28395","29385","28495","29485","28695","29685","28741","48721","29046","49026","29047","47029","29145","49125","29541","49521","29746","49726","30315","31305","30417","31407","30515","31505","30519","31509","30619","31609","30715","31705","30717","31707","30719","31709","30815","31805","30819","31809","30915","31905","35058","37038","35059","37039","35061","36051","35079","37059","35158","37138","35159","37139","35169","36159","35170","37150","35269","36259","35270","37250","35369","36359","35370","37350","35570","37550","35950","37930","35958","37938","35961","36951","35979","37959","36079","37069","36171","37161","36179","37169","36279","37269","36471","37461","36998","39986","37081","38071","37085","38075","37090","39070","37185","38175","37190","39170","37281","38271","37285","38275","37385","38375","37390","39370","37481","38471","37490","39470","37509","39507","37581","38571","37585","38575","37790","39770","38095","39085","38195","39185","38291","39281","38295","39285","38391","39381","38491","39481","38495","39485","38691","39681","38695","39685","40227","42207","40319","41309","40417","41407","40419","41409","40427","42407","40429","42409","40527","42507","40529","42509","40617","41607","40717","41707","40819","41809","40917","41907","41093","43091","41427","42417","41429","42419","41527","42517","41529","42519","41729","42719","41827","42817","41873","43871","41929","42919","45848","46856","45948","46956","46079","47069","46169","48149","46171","47161","46269","48249","46279","47269","46281","48261","46371","47361","46479","47469","46681","48661","46881","48861","47081","48071","47091","49071","47109","49107","47119","49117","47181","48171","47190","49170","47290","49270","47291","49271","47309","49307","47319","49317","47381","48371","47409","49407","47419","49417","47490","49470","47519","49517","47581","48571","47590","49570","47990","49970","47991","49971","48091","49081","48191","49181","48291","49281","48491","49481","50013","53001","50039","53009","50058","70038","50073","70053","50079","70059","50173","70153","50178","70158","50179","70159","50229","52209","50319","51309","50373","70353","50413","51403","50417","51407","50419","51409","50478","70458","50513","51503","50517","51507","50529","52509","70509","50613","51603","50619","51609","50713","51703","50717","51707","50739","53709","50758","70738","50759","70739","50819","51809","50829","52809","50858","70838","50913","51903","50919","51909","50959","70939","50973","70953","51074","71054","51138","53118","51139","53119","51158","71138","51159","71139","51179","71159","51278","71258","51279","71259","51538","53518","51593","53591","51627","52617","51638","53618","51683","53681","51693","53691","51729","52719","51750","71730","51759","71739","51827","52817","51838","53818","51839","53819","51858","71838","51874","71854","51893","53891","51927","52917","51929","52919","51938","53918","51939","53919","51979","71959","51983","53981","52037","53027","52039","53029","52079","72059","52088","70088","52179","72159","52279","72259","52378","72358","52478","72458","52508","70508","52580","70580","52590","70590","52639","53629","52693","71683","52720","70720","52737","53727","52739","53729","52750","70750","52751","72731","52758","72738","52802","70802","52820","70820","52839","53829","52858","72838","52880","70880","52902","70902","52937","53927","52939","53929","52950","70950","52959","72939","73929","53070","73050","75030","53159","73139","53170","75130","53279","73259","53370","73350","53379","73359","53670","75630","53850","73830","53859","73839","53950","73930","53958","73938","53979","73959","54479","75449","54753","73743","55070","77030","55071","77031","55170","77130","55970","77930","57009","59007","57081","58071","57090","59070","79050","57091","59071","57129","59127","57191","79151","57192","79152","57219","59217","57290","59270","79250","57292","79252","57319","59317","57381","58371","57390","59370","79350","57391","59371","79351","57429","59427","57483","58473","57490","59470","57581","58571","57591","59571","57790","59770","57791","59771","57990","59970","79950","57991","59971","57992","79952","58091","59081","58193","59183","58491","59481","58493","59483","58593","59583","58691","59681","59151","79131","59170","79150","59271","79251","59373","79353","59623","78613","59751","79731","59950","79930","59973","79953","60069","80049","60183","80163","60189","80169","60313","61303","60383","80363","60413","61403","60429","62409","60483","80463","60513","61503","60629","62609","60729","62709","60819","61809","60829","62809","60869","80849","60919","61909","60969","80949","60985","80965","61085","81065","61289","81269","61529","62519","61539","63519","61629","62619","61639","63619","61869","81849","61893","63891","61939","63919","61993","63991","62039","63029","62185","82165","62249","64229","62269","82249","62449","64429","62589","82569","62639","63629","62649","64629","62739","63729","62849","64829","62939","63929","62949","64929","62985","82965","63041","64031","63141","64131","63489","83469","63741","64731","63849","64839","63862","83842","63869","83849","63941","64931","63969","83949","64080","86040","64081","84061","64180","86140","64181","86141","64269","84249","64481","84461","64780","86740","64961","84941","64962","84942","65862","82854","66081","88041","66082","88042","66180","88140","66181","88141","66182","88142","66280","88240","67019","69017","67129","69127","68091","69081","68193","69183","68291","69281","68293","69283","68391","69381","68491","69481","68493","69483","68591","69581","68693","69683","68991","89961","68993","89963","70013","73001","70094","90074","70095","90075","70195","90175","70293","90273","70295","90275","70393","90373","70394","90374","70395","90375","70415","71405","70419","71409","70494","90474","70519","71509","70594","90574","70615","71605","70713","71703","70715","71705","70719","71709","70813","71803","70815","71805","70915","71905","70919","71909","71094","91074","71095","91075","71194","91174","71294","91274","71394","91374","71395","91375","71494","91474","71495","91475","71525","72515","71529","72519","71595","91575","71625","72615","71629","72619","71725","72715","71825","72815","71829","72819","72035","73025","72039","73029","72095","92075","72195","92175","72295","92275","72395","92375","72495","92475","72535","73525","72635","73625","72735","73725","72935","73925","73041","74031","73051","75031","73071","75051","73090","93070","97030","73141","74131","73149","74139","73170","75150","73190","97130","73390","93370","73481","92453","73490","93470","73590","93570","73641","74631","73649","74639","73750","75730","73751","75731","73790","95750","73890","97830","73949","74939","73950","75930","73951","75931","73971","75951","74051","75041","74059","75049","74090","94070","74091","94071","74159","75149","74190","94170","74191","97141","74251","75241","74259","75249","74290","94270","74390","94370","74391","94371","74490","94470","74491","94471","74591","94571","74751","75741","74859","75849","74891","97841","75090","95070","97050","75091","97051","75092","97052","75190","95170","97150","75191","95171","75192","97152","75290","97250","75291","95271","75392","97352","75490","95470","75590","95570","75890","97850","75891","97851","75892","97852","80013","83001","80225","82205","80313","81303","80415","81405","80425","82405","80515","81505","80525","82505","80613","81603","80615","81605","80625","82605","80713","81703","80715","81705","80813","81803","80825","82805","80915","81905","80925","82905","81135","83115","81253","85231","81335","83315","81425","82415","81525","82515","81535","83515","81625","82615","81653","83651","81735","83715","81825","82815","81835","83815","81853","85831","81953","85931","82035","83025","82060","86020","82535","83525","82735","83725","82806","86802","82860","86820","82906","86902","82935","83925","82960","86920","83050","85030","83051","85031","83061","86031","83073","85053","83150","85130","83151","85131","83173","85153","83282","84254","83346","86334","83641","84631","83750","85730","83751","85731","83841","84831","83850","85830","83861","86831","83950","85930","83961","86931","84051","85041","84062","86042","84074","85082","84081","86061","84082","86062","84083","86063","84174","85182","84251","85241","84261","86241","84262","86242","84274","85282","84951","85941","84962","86942","85063","86053","85161","86151","85163","86153","85261","86251","85263","86253","85361","86351","85363","86353","85863","86853","85963","86953","86076","87084","86176","87184","86276","87284","86376","87384","86476","87484","90017","97001","90025","92005","90026","92006","96002","90035","93005","90225","92205","90226","92206","90280","94240","90313","91303","90315","91305","90317","91307","90413","91403","90415","91405","90417","91407","90425","92405","90513","91503","90515","91505","90526","92506","90535","93505","90613","91603","90625","92605","90626","92606","90635","93605","90715","91705","90725","92705","90726","92706","90735","93705","90813","91803","90826","96802","90835","93805","90915","91905","90925","92905","90926","92906","96902","90950","92930","90970","92950","91135","93115","91253","95231","91263","96231","91335","93315","91425","92415","91527","92517","91535","93515","91563","93561","91625","92615","91635","93615","91653","93651","91663","93661","91753","95731","91825","92815","91827","92817","91835","93815","91853","95831","91863","93861","91925","92915","91927","92917","91935","93915","91953","93951","95931","92046","94026","92060","96020","92446","94426","92535","93525","92735","93725","92746","94726","92835","93825","92846","94826","92860","96820","92935","93925","93050","95030","93061","96031","93071","97031","93117","97113","93141","94131","93147","94137","93151","95131","93171","97131","93641","94631","93647","94637","93747","94737","93750","95730","93841","94831","93917","97913","93950","95930","93971","97931","94051","95041","94061","96041","94062","96042","94162","96142","94218","98214","94251","95241","94257","95247","94274","95282","94751","95741","94851","95841","94861","96841","94862","96842","94971","97941","95057","97037","95061","96051","95063","96053","95073","97053","95157","97137","95161","96151","95163","96153","95370","97350","95371","97351","95373","97353","95863","96853","95961","96951","95973","97953","96071","97061","96171","97161","96371","97361"]),
      randomIcon: "M138.798 35.342L28.73 114.268l95.777 29.095 111.305-87.09-97.014-20.93zm112.986 31.082l-118.047 89.96 51.07 131.102 8.534-7.455 4.23-15.708a18.338 13.102 76.863 0 1-9.08-20.45 18.338 13.102 76.863 0 1 10.997-13.727 18.338 13.102 76.863 0 1 3.62.53 18.338 13.102 76.863 0 1 3.113 1.544l7.94-29.48a9 9 0 0 1 .353-1.04 9 9 0 0 1 .058-.128 9 9 0 0 1 .32-.685 9 9 0 0 1 .09-.153 9 9 0 0 1 .37-.625 9 9 0 0 1 .534-.723 9 9 0 0 1 .066-.074 9 9 0 0 1 .54-.594 9 9 0 0 1 .65-.593 9 9 0 0 1 .004-.002 9 9 0 0 1 .46-.342 9 9 0 0 1 .266-.197 9 9 0 0 1 .502-.3 9 9 0 0 1 .27-.157 9 9 0 0 1 .44-.208 9 9 0 0 1 .38-.178 9 9 0 0 1 .437-.152 9 9 0 0 1 .41-.143 9 9 0 0 1 .404-.1 9 9 0 0 1 .47-.114 9 9 0 0 1 .51-.07 9 9 0 0 1 .37-.05 9 9 0 0 1 .01 0 9 9 0 0 1 .01-.003l33.624-2.873a18.338 13.102 76.863 0 1 10.326-9.777 18.338 13.102 76.863 0 1 3.622.53 18.338 13.102 76.863 0 1 8.527 7.327l13.043-1.113-39.442-123.783zM137.25 74.03a9.8 19.77 77.916 0 1 12.798 8.734 9.8 19.77 77.916 0 1-21.938 11.998 9.8 19.77 77.916 0 1-16.57-8.602 9.8 19.77 77.916 0 1 21.938-12 9.8 19.77 77.916 0 1 3.77-.13zm100.228 23.517a18.338 13.102 76.863 0 1 .002 0 18.338 13.102 76.863 0 1 3.62.53 18.338 13.102 76.863 0 1 12.112 21.94 18.338 13.102 76.863 0 1-14.617 13.196 18.338 13.102 76.863 0 1-12.114-21.94 18.338 13.102 76.863 0 1 10.998-13.726zM24.22 131.71l46.992 114.124 94.236 40.38-45.988-125.57-95.24-28.935zm147.886 17.43a18.338 13.102 76.863 0 1 3.622.528 18.338 13.102 76.863 0 1 12.11 21.94 18.338 13.102 76.863 0 1-14.616 13.197 18.338 13.102 76.863 0 1-12.112-21.94 18.338 13.102 76.863 0 1 10.996-13.726zm-75.123 13.016a19.454 9.134 59.254 0 1 16.955 15.078 19.454 9.134 59.254 0 1-.425 19.485A19.454 9.134 59.254 0 1 95.6 181.78a19.454 9.134 59.254 0 1 .424-19.48 19.454 9.134 59.254 0 1 .96-.144zm263.393 40.21l-112.102 9.577 113.762 79.926 113.598-16.956-115.258-72.55zM70.82 212.022A19.454 9.134 59.254 0 1 87.777 227.1a19.454 9.134 59.254 0 1-.425 19.484 19.454 9.134 59.254 0 1-17.913-14.938 19.454 9.134 59.254 0 1 .425-19.482 19.454 9.134 59.254 0 1 .96-.14zm157.378 7.813L186.66 374.023l115.616 99.454 47.147-168.47-121.225-85.17zm126.987 11.168a21.76 8.898 15.267 0 1 19.693 4.783 21.76 8.898 15.267 0 1 7.607 14.244 21.76 8.898 15.267 0 1-28.886-3.182 21.76 8.898 15.267 0 1-7.61-14.244 21.76 8.898 15.267 0 1 9.195-1.6zM487.78 291.3L366.9 309.343l-46.823 167.316 116.297-31.77L487.78 291.3zm-181.808 10.8a25.834 15.573 84.277 0 1 4.238.943 25.834 15.573 84.277 0 1 12.873 31.72 25.834 15.573 84.277 0 1-18.105 17.893 25.834 15.573 84.277 0 1-12.874-31.72 25.834 15.573 84.277 0 1 13.868-18.836zm154.086 11.636a13.237 21.96 28.62 0 1 7.673 4.13 13.237 21.96 28.62 0 1-6.176 28.435 13.237 21.96 28.62 0 1-21.287 3.878 13.237 21.96 28.62 0 1 6.175-28.434 13.237 21.96 28.62 0 1 13.616-8.008zM391.362 324.4a13.237 21.96 28.62 0 1 7.672 4.13 13.237 21.96 28.62 0 1-6.176 28.435 13.237 21.96 28.62 0 1-21.287 3.877 13.237 21.96 28.62 0 1 6.177-28.434 13.237 21.96 28.62 0 1 13.615-8.008zm-173.996 13.305a25.834 15.573 84.277 0 1 4.24.945 25.834 15.573 84.277 0 1 12.872 31.72 25.834 15.573 84.277 0 1-18.106 17.894 25.834 15.573 84.277 0 1-12.873-31.72 25.834 15.573 84.277 0 1 13.866-18.84zm212.278 60.87a13.237 21.96 28.62 0 1 7.67 4.13 13.237 21.96 28.62 0 1-6.174 28.434 13.237 21.96 28.62 0 1-21.287 3.876 13.237 21.96 28.62 0 1 6.175-28.434 13.237 21.96 28.62 0 1 13.616-8.008zm-70.332 19.488a13.237 21.96 28.62 0 1 7.67 4.132 13.237 21.96 28.62 0 1-6.174 28.434 13.237 21.96 28.62 0 1-21.287 3.874 13.237 21.96 28.62 0 1 6.176-28.434 13.237 21.96 28.62 0 1 13.616-8.007z",
    }
  },

  watch: {
    mode() {
        this.draftGuess = Array(5).fill('')
        this.selectedCellIndex = 0
      if (this.mode === 2) {
        if (!this.archiveDay) {
          this.archiveDialog = true
          this.archiveDay = this.yesterday
        }
        this.gameCompleted = false
        return
      }
      if (this.randomGoal === null) {
            this.initializeRandomPuzzle()
        }
        // clear notes when switching modes
        this.draftNotes = Array(this.guessLength).fill(null).map(() => Array(10).fill(false))
        this.notesMode = false
        this.gameCompleted = this.guesses.length > 0 && this.guesses[this.guesses.length-1].guess.join('') === this.goal.guess.join('')
    }
  },

  methods: {
    async handleAuthenticated(session) {
      this.token = session.token || localStorage.getItem('nerdle_token') || ''
      this.email = session.email || ''
      localStorage.setItem('nerdle_token', this.token)
      localStorage.setItem('email', this.email)
      this.authVisible = false
      if (this.mode === 2 && this.archiveDay) {
        await this.loadArchivePuzzle(this.archiveDay)
      } else {
        let r = await getPuzzle(this.token, this.today)
        if (r.ok && r.data) {
          this.loadPuzzle(r.data)
          this.mode = 0
        }
      }
      await this.getSummary()
    },

    openArchiveLogin() {
      this.archiveDialog = false
      this.authVisible = true
    },

    getDateString(date) {
      const year = date.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric' })
      const month = date.toLocaleString('en-US', { timeZone: 'America/New_York', month: '2-digit' })
      const day = date.toLocaleString('en-US', { timeZone: 'America/New_York', day: '2-digit' })
      return `${year}-${month}-${day}`
    },

    generateSeededGoal(day) {
      const random = seedrandom(day)
      let goal = null
      while (goal === null || this.skips.has(goal.join(''))) {
        goal = Math.floor(random() * 100000).toString().padStart(5, '0').split('').map(Number)
      }
      return {
        guess: goal,
        tags: this.getTags(goal)
      }
    },

    handleLogout() {
      localStorage.removeItem('nerdle_token')
			localStorage.removeItem('email')
      this.token = ''
      this.email = ''
      this.authVisible = false
      this.completedPuzzles = []
      this.counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
    },

    refreshAfterUpdate() {
      this.newUpdate = false
      window.location.reload()
    },

    async getSummary() {
      if (!this.token) return
      const result = await getSummary(this.token)
      if (result.ok && result.data && result.data.counts && result.data.completed) {
        this.counts = result.data.counts
        this.completedPuzzles = result.data.completed
      } else if (result.status === 401) {
        this.handleLogout()
        this.newUpdate = true
      }
    },

    async selectArchiveDay(day) {
      if (!day) return
      await this.loadArchivePuzzle(day)
      this.archiveDialog = false
    },

    async loadArchivePuzzle(day) {
      this.archiveDay = day
      this.day = day
      this.archiveGoal = this.generateSeededGoal(day)
      this.archiveGuesses = []
      this.archiveKnownTrueTags = new Set()
      this.archiveKnownFalseTags = new Set()
      this.maxRows = 5
      this.gameCompleted = false
      this.winDialog = false

      if (this.token) {
        this.archiveLoading = true
        const result = await getPuzzle(this.token, day)
        this.archiveLoading = false
        if (result.ok && result.data) {
          this.loadPuzzle(result.data)
        } else if (result.status === 401) {
          this.handleLogout()
          this.newUpdate = true
        }
      }
    },

    async savePuzzle() {
      const puzzle = {
        day: this.day,
        goal: this.goal.guess.join(''),
        guesses: this.guesses.map(g => g.guess.join('')),
      }
      if (this.mode === 0 && this.day === this.today) {
        localStorage.setItem('puzzle', JSON.stringify(puzzle))
      }
      if (this.token) {
        const result = await savePuzzle(this.token, puzzle)
        if (!result.ok && result.status === 401) {
          this.handleLogout()
          this.newUpdate = true
        }
      }
    },

    loadPuzzle(puzzle) {
      this.day = puzzle.day
      const isArchive = this.mode === 2
      const guessesKey = isArchive ? 'archiveGuesses' : 'dailyGuesses'
      const goalKey = isArchive ? 'archiveGoal' : 'dailyGoal'
      const trueTagsKey = isArchive ? 'archiveKnownTrueTags' : 'dailyKnownTrueTags'
      const falseTagsKey = isArchive ? 'archiveKnownFalseTags' : 'dailyKnownFalseTags'
      const loadedGuesses = puzzle.guesses.map(g => ({
        guess: g.split('').map(Number),
        tags: this.getTags(g.split('').map(Number))
      }))
      let goal = puzzle.goal.split('').map(Number)
      this[goalKey] = {
        guess: goal,
        tags: this.getTags(goal)
      }
      this[trueTagsKey] = new Set()
      this[falseTagsKey] = new Set()
      loadedGuesses.forEach(guess => {
        let right = 0
        guess.tags.forEach(tag => {
          if (this[goalKey].tags.includes(tag)) {
            this[trueTagsKey].add(tag)
            right++
          } else {
            this[falseTagsKey].add(tag)
          }
        })
        guess.score = [right, this[goalKey].tags.length]
      })
      this[guessesKey] = loadedGuesses
      this.maxRows = 5
      this.gameCompleted = loadedGuesses.length > 0 && loadedGuesses[loadedGuesses.length-1].guess.join('') === this[goalKey].guess.join('')
      if (this.gameCompleted) {
          this.winDialog = true
      } else {
          this.maxRows = Math.max(this.maxRows, loadedGuesses.length + 1)
      }
    },

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
      const digit = Number(value)
      if (this.notesMode) {
        const idx = this.selectedCellIndex >= 0 ? this.selectedCellIndex : 0
        if (!this.draftNotes[idx]) {
          this.$set(this.draftNotes, idx, Array(10).fill(false))
        }
        this.$set(this.draftNotes[idx], digit, !this.draftNotes[idx][digit])
        return
      }
      this.fillNextDigit(value)
    },

    getNoteStyle(index) {
      // mapping: index -> (col, row)
      // 0 1 2 3
      // 4     5
      // 6 7 8 9
      let col = 1, row = 1
      switch (index) {
        case 0: col = 1; row = 1; break
        case 1: col = 2; row = 1; break
        case 2: col = 3; row = 1; break
        case 3: col = 4; row = 1; break
        case 4: col = 1; row = 2; break
        case 5: col = 4; row = 2; break
        case 6: col = 1; row = 3; break
        case 7: col = 2; row = 3; break
        case 8: col = 3; row = 3; break
        case 9: col = 4; row = 3; break
      }
      return { gridColumn: col, gridRow: row, fontSize: this.isMobile ? '0.65em' : '0.5em' }
    },

    clearDraftGuess() {
      this.draftGuess = Array(this.guessLength).fill('')
      this.selectedCellIndex = 0
    },

    handleGlobalKeydown(event) {
      if (this.authVisible) return
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
        this.pressDigit(event.key)
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
      if (this.selectedCellIndex > 0 && this.draftGuess[this.selectedCellIndex] === '') {
        this.selectedCellIndex--
      }
      if (this.selectedCellIndex === -1) this.selectedCellIndex = this.draftGuess.length - 1
      this.$set(this.draftGuess, this.selectedCellIndex, '')
    },

    fillRandomGuess() {
      const randomValue = Math.floor(Math.random() * 100000)
        .toString()
        .padStart(this.guessLength, '0')
        .split('')
      this.draftGuess = randomValue
      this.selectedCellIndex = 0
    },

    initializeRandomPuzzle() {
      let randomGoal = null
      while (randomGoal === null || this.skips.has(randomGoal.join(''))) {
        randomGoal = Math.floor(Math.random() * 100000).toString().padStart(5, '0').split('').map(Number)
      }
      this.randomGoal = {
        guess: randomGoal,
        tags: this.getTags(randomGoal)
      }
      console.log(randomGoal)
      this.randomGuesses = []
      this.randomKnownTrueTags = new Set()
      this.randomKnownFalseTags = new Set()
      this.draftGuess = Array(this.guessLength).fill('')
      this.selectedCellIndex = 0
      this.draftNotes = Array(this.guessLength).fill(null).map(() => Array(10).fill(false))
      this.notesMode = false
      this.gameCompleted = false
      this.winDialog = false
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
      // keep notes on submitting a full guess
      this.notesMode = false

      if (digits.join('') === this.goal.guess.join('')) {
        this.gameCompleted = true
        this.winDialog = true
        if (this.mode !== 1) {
          this.counts[this.guesses.length]++
        }
      }
      if (this.mode === 0 || this.mode === 2) {
        this.savePuzzle()
      }
      if (this.guesses.length >= this.maxRows && !this.gameCompleted) {
          this.maxRows += 1
      }
    },

    scoreGuess(tags) {
        const goalTags = new Set(this.goal.tags)
        const sharedTags = tags.filter(tag => goalTags.has(tag))
        return [sharedTags.length, this.goal.tags.length]
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
        let maxStreaks = []
        let currentStreaks = { up: 1, down: 1, same: 1 }
        let differences = []
        let diff;
        let saveUp = false, saveDown = false, saveSame = false
        guess.forEach((digit, i) => {
            counts[digit] = (counts[digit] || 0) + 1
            saveUp = saveDown = saveSame = false
            if (i > 0) {
                switch (true) {
                    case guess[i] === guess[i - 1]+1:
                        currentStreaks.up++
                        saveDown = saveSame = true
                        break
                    case guess[i] === guess[i - 1]-1:
                        currentStreaks.down++
                        saveUp = saveSame = true
                        break
                    case guess[i] === guess[i - 1]:
                        currentStreaks.same++
                        saveUp = saveDown = true
                        break
                    default:
                        saveUp = saveDown = saveSame = true
                }
                if (saveUp) {
                  maxStreaks.push(`up:${currentStreaks.up}`)
                  currentStreaks.up = 1
                }
                if (saveDown) {
                  maxStreaks.push(`down:${currentStreaks.down}`)
                  currentStreaks.down = 1
                }
                if (saveSame) {
                  maxStreaks.push(`same:${currentStreaks.same}`)
                  currentStreaks.same = 1
                }
                diff = guess[i] - guess[i - 1]
                differences.push(
                    diff === 0 ? 'same' : diff > 0 ? 'up' : 'down'
                )
            }
        })
        maxStreaks.push(`up:${currentStreaks.up}`)
        maxStreaks.push(`down:${currentStreaks.down}`)
        maxStreaks.push(`same:${currentStreaks.same}`)

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
        if (Object.values(counts).includes(2)) tags.push('pair')
        if (Object.values(counts).includes(3)) tags.push('triple')
        if (Object.values(counts).includes(4)) tags.push('quadruple')
        if (Object.values(counts).includes(5)) tags.push('quintuple')
        if (maxStreaks.includes('same:2')) tags.push('pair_seq')
        if (maxStreaks.includes('same:3')) tags.push('triple_seq')
        if (maxStreaks.includes('same:4')) tags.push('quadruple_seq')
        if (maxStreaks.includes('same:5')) tags.push('quintuple_seq')
        if (guess.join('') === guess.slice().reverse().join('')) tags.push('palindrome')
        if (maxStreaks.includes('up:2')) tags.push('increasing_pair')
        if (maxStreaks.includes('down:2')) tags.push('decreasing_pair')
        if (maxStreaks.includes('up:3')) tags.push('increasing_triple')
        if (maxStreaks.includes('down:3')) tags.push('decreasing_triple')
        if (maxStreaks.includes('up:4')) tags.push('increasing_quadruple')
        if (maxStreaks.includes('down:4')) tags.push('decreasing_quadruple')
        if (maxStreaks.includes('up:5')) tags.push('increasing_quintuple')
        if (maxStreaks.includes('down:5')) tags.push('decreasing_quintuple')
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
      return this.descriptions[tag] ? this.descriptions[tag].title : tag
    },

    getTagDescription(tag) {
      return this.descriptions[tag] ? this.descriptions[tag].description : ''
    },

    copyShare() {
      const text = this.shareText
      if (!text) return
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      this.copied = true
    },

    translateDay(day) {
      if (!day) return ''
      const bits = day.split('-')
      return `${bits[1]}/${bits[2]}/${bits[0]}`
    },
  },
  computed: {
    goal() {
      if (this.mode === 0) return this.dailyGoal
      if (this.mode === 2) return this.archiveGoal
      return this.randomGoal
    },

    guesses() {
      if (this.mode === 0) return this.dailyGuesses
      if (this.mode === 2) return this.archiveGuesses
      return this.randomGuesses
    },

    knownFalseTags() {
      if (this.mode === 0) return this.dailyKnownFalseTags
      if (this.mode === 2) return this.archiveKnownFalseTags
      return this.randomKnownFalseTags
    },

    knownTrueTags() {
      if (this.mode === 0) return this.dailyKnownTrueTags
      if (this.mode === 2) return this.archiveKnownTrueTags
      return this.randomKnownTrueTags
    },

    yesterday() {
      const date = new Date()
      date.setDate(date.getDate() - 1)
      return this.getDateString(date)
    },

    isGuessComplete() {
      return this.draftGuess.every(value => value !== '') && !this.guesses.map(guess => guess.guess.join('')).includes(this.draftGuess.join(''))
    },

    goalGuessText() {
      return this.goal ? this.goal.guess.join('') : ''
    },

    shareText() {
      if (!this.goal) return ''
      const lines = []
      const modeLabel = this.mode === 0 ? 'Daily' : this.mode === 2 ? `Archive ${this.translateDay(this.archiveDay)}` : 'Random'
      lines.push(`${modeLabel} thenamor.github.io/Nerdle solved in ${this.guesses.length} guesses`)

      const total = this.goal.tags.length
      const trueSet = new Set()
      const falseSet = new Set()

      let available = Object.keys(this.tagMap)

      this.guesses.forEach((g, idx) => {
        // update known sets based on this guess
        g.tags.forEach(t => {
          if (this.goal.tags.includes(t)) trueSet.add(t)
          else falseSet.add(t)
        })

        const correct = g.tags.filter(t => this.goal.tags.includes(t)).length
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0
        available = available.filter(num => {
          return trueSet.isSubsetOf(this.tagMap[num]) && falseSet.isDisjointFrom(this.tagMap[num])
        })
        lines.push(`${idx + 1}. ${correct}/${total} tags (${pct}%) - ` + (idx == this.guesses.length-1 ? `done!` : `${available.length} number${available.length === 1 ? '' : 's'} left`))
      })

      return lines.join('\n')
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
                description: 'Has at least one set of exactly two neighboring digits in increasing order.'
            },
            decreasing_pair: {
                title: 'Decreasing Pair',
                description: 'Has at least one set of exactly two neighboring digits in decreasing order.'
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

.session-update-notification {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 10;
  margin: 0;
  border-radius: 0;
  text-align: center;
}

.auth-launcher {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 5;
  background: rgba(18, 24, 20, 0.82);
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

.notes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
  width: 100%;
  height: 100%;
  padding: 6px 4px;
  box-sizing: border-box;
  align-content: center;
}

.note {
  display: flex;
  align-items: center;
  justify-content: center;
  /* size relative to the cell's font-size so it scales responsively */
  color: rgba(230, 255, 234, 0.95);
  text-align: center;
  line-height: 1;
  height: 100%;
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

.share-card {
  text-align: left;
  max-height: 36vh;
  overflow: auto;
}

.share-pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace;
  white-space: pre-wrap;
  color: #e6ffea;
  background: transparent;
  padding: 6px 0;
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