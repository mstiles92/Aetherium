<template>
    <div id="app">
        <nav class="navbar navbar-default">
            <div class="container-fluid">
                <!-- Brand and toggle get grouped for better mobile display -->
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#header-navbar-collapse" aria-expanded="false">
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </button>
                    <router-link class="navbar-brand" to="/" exact>Aetherium</router-link>
                </div>

                <!-- Collect the nav links, forms, and other content for toggling -->
                <div class="collapse navbar-collapse" id="header-navbar-collapse">
                    <ul class="nav navbar-nav">
                        <router-link to="/timer" v-slot="{ href, navigate, isActive }">
                            <li :class="{ active: isActive }">
                                <a :href="href" @click="navigate">Timer</a>
                            </li>
                        </router-link>
                        <router-link to="/statistics" v-slot="{ href, navigate, isActive }">
                            <li :class="{ active: isActive }">
                                <a :href="href" @click="navigate">Session Stats</a>
                            </li>
                        </router-link>
                        <router-link to="/history" v-slot="{ href, navigate, isActive }">
                            <li :class="{ active: isActive }">
                                <a :href="href" @click="navigate">History</a>
                            </li>
                        </router-link>
                        <router-link to="/personal-bests" v-slot="{ href, navigate, isActive }">
                            <li :class="{ active: isActive }">
                                <a :href="href" @click="navigate">Personal Bests</a>
                            </li>
                        </router-link>
                    </ul>

                    <form class="navbar-form navbar-left" v-if="puzzles">
                        <div class="form-group">
                            <select class="form-control" v-model="activePuzzle">
                                <option v-for="puzzle in puzzles" :key="puzzle.key" :value="puzzle.key">{{ puzzle.name }}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <button type="button" class="btn btn-primary" @click="onCloseSessionClick">
                                Close Session
                            </button>
                        </div>
                    </form>

                    <ul class="nav navbar-nav navbar-right">
                        <li class="dropdown">
                            <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                                <span class="glyphicon glyphicon-cog"></span>
                                <span class="caret"></span>
                            </a>
                            <ul class="dropdown-menu">
                                <li>
                                    <a href="#" @click="openOptionsModal">Options</a>
                                </li>
                                <li>
                                    <a href="#" @click="openImportModal">Import</a>
                                </li>
                                <li role="separator" class="divider"></li>
                                <li><a href="#" @click="logout">Logout</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>

        <!-- Close Session Modal -->
        <div class="modal fade" id="closeSessionModal" tabindex="-1" role="dialog" aria-labelledby="closeSessionModalLabel">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        <h4 class="modal-title" id="closeSessionModalLabel">
                            Close Session
                        </h4>
                    </div>

                    <div class="modal-body">
                        <form class="form-inline">
                            <div class="form-group">
                                <p>
                                    Are you sure you would like to close the current session?
                                </p>
                            </div>
                            <div class="form-group">
                                <label for="sessionDatePicker">Session Date:</label>
                                <date-picker id="sessionDatePicker" v-model="sessionDate" :config="datePickerConfig"></date-picker>
                            </div>
                        </form>

                        <!-- TODO: Add quick summary of session stats for each puzzle -->
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-primary" data-dismiss="modal" @click="onCloseSessionConfirm">
                            Close Session
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Options Modal -->
        <div class="modal fade" id="optionsModal" tabindex="-1" role="dialog" aria-labelledby="optionsModalLabel">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        <h4 class="modal-title" id="optionsModalLabel">
                            Options
                        </h4>
                    </div>

                    <div class="modal-body">
                        <label for="timerTriggerOptionsGroup">Timer Trigger</label>
                        <div class="btn-group" id="timerTriggerOptionsGroup" data-toggle="buttons">
                            <label
                                class="btn btn-default"
                                :class="{
                                    active: options.timerTrigger === 'spacebar'
                                }"
                                @click="options.timerTrigger = 'spacebar'"
                            >
                                <input type="radio" name="timerTriggerOptions" id="spacebarTimerTrigger" autocomplete="off" />Spacebar
                            </label>
                            <label
                                class="btn btn-default"
                                :class="{
                                    active: options.timerTrigger === 'stackmat'
                                }"
                                @click="options.timerTrigger = 'stackmat'"
                            >
                                <input type="radio" name="timerTriggerOptions" id="stackmatTimerTrigger" autocomplete="off" />Stackmat
                            </label>
                        </div>

                        <hr />

                        <input type="checkbox" id="showTimerCheckbox" v-model="options.showTimer" />
                        <label for="showTimerCheckbox">Show timer while solving</label>

                        <hr />

                        <input type="checkbox" id="holdToStartCheckbox" v-model="options.holdToStart" />
                        <label for="holdToStartCheckbox">Hold spacebar/touchscreen to start timer</label>

                        <hr />

                        <input type="checkbox" id="useInspectionCheckbox" v-model="options.useInspection" />
                        <label for="useInspectionCheckbox">Use inspection</label>

                        <hr />

                        <div class="form-group form-inline">
                            <label for="themeSelector">Theme</label>
                            <select class="form-control" id="themeSelector" v-model="options.themeUrl">
                                <option v-for="theme in themes" :key="theme.name" :value="theme.url">{{ theme.name }}</option>
                            </select>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-primary" data-dismiss="modal" @click="onOptionsModalSave">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Import Modal -->
        <div class="modal fade" id="importModal" tabindex="-1" role="dialog" aria-labelledby="importModalLabel">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        <h4 class="modal-title" id="importModalLabel">
                            Import
                        </h4>
                    </div>

                    <div class="modal-body">
                        <p>Example Input:</p>
                        <pre><code>{{ JSON.stringify({
                            "M/D/YYYY": {
                                "puzzle": [
                                    {
                                        "penalty": "",
                                        "scramble": "",
                                        "time": 0,
                                        "timestamp": 1234567890000
                                    }
                                ]
                            }
                        }, undefined, 2) }}
                        </code></pre>
                        <div
                            class="form-group"
                            :class="{
                                'has-error': !importTextValid,
                                'has-success': importTextValid
                            }"
                        >
                            <textarea class="form-control" @input="validateImportText" v-model="importText"></textarea>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">
                            Cancel
                        </button>
                        <button type="button" class="btn btn-primary" data-dismiss="modal" @click="runImport">
                            Import
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import moment from 'moment'
    import $ from 'jquery'
    import Vue from 'vue'
    import { Component } from 'vue-property-decorator'
    import { ThemeData } from '@/types'
    import { Actions } from '@/types/store'
    import { SolveImporter } from '@/util/solve-importer'
    import { auth } from 'firebase'
    import { FirebaseList, ProfileOptions, Puzzle, TimerTrigger } from '@/types/firebase'

    @Component
    export default class Navbar extends Vue {
        public options: ProfileOptions = {
            showTimer: true,
            timerTrigger: TimerTrigger.SPACEBAR,
            holdToStart: true,
            useInspection: true,
            themeUrl: '/themes/default.min.css'
        }
        public datePickerConfig = {
            format: 'MM/DD/YYYY'
        }
        public importTextValid = true
        public importText = ''
        public solveImporter?: SolveImporter
        public themes: ThemeData[] = [
            { name: 'Default', url: '/themes/default.min.css' },
            { name: 'Cerulean', url: '/themes/cerulean.min.css' },
            { name: 'Cosmo', url: '/themes/cosmo.min.css' },
            { name: 'Cyborg', url: '/themes/cyborg.min.css' },
            { name: 'Darkly', url: '/themes/darkly.min.css' },
            { name: 'Flatly', url: '/themes/flatly.min.css' },
            { name: 'Journal', url: '/themes/journal.min.css' },
            { name: 'Lumen', url: '/themes/lumen.min.css' },
            { name: 'Paper', url: '/themes/paper.min.css' },
            { name: 'Readable', url: '/themes/readable.min.css' },
            { name: 'Sandstone', url: '/themes/sandstone.min.css' },
            { name: 'Simplex', url: '/themes/simplex.min.css' },
            { name: 'Slate', url: '/themes/slate.min.css' },
            { name: 'Spacelab', url: '/themes/spacelab.min.css' },
            { name: 'Superhero', url: '/themes/superhero.min.css' },
            { name: 'United', url: '/themes/united.min.css' },
            { name: 'Yeti', url: '/themes/yeti.min.css' }
        ]

        get puzzles(): Puzzle[] {
            if (this.$store.state.puzzles) {
                const puzzles: FirebaseList<Puzzle> = this.$store.state.puzzles
                return Object.values(puzzles).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            } else {
                return []
            }
        }

        get activePuzzle(): string {
            return this.$store.state.activePuzzle
        }

        set activePuzzle(value: string) {
            this.$store.dispatch(Actions.SET_ACTIVE_PUZZLE, { puzzle: value })
        }

        get storeOptions(): ProfileOptions {
            return this.$store.state.options
        }

        set storeOptions(value: ProfileOptions) {
            this.$store.dispatch(Actions.SET_OPTIONS, value)
        }

        get sessionDate(): string {
            return this.$store.state.sessionDate
        }

        set sessionDate(value: string) {
            this.$store.dispatch(Actions.UPDATE_SESSION_DATE, {
                moment: moment()
                    .utc()
                    .dayOfYear(moment(value, 'MM/DD/YYYY').dayOfYear())
                    .startOf('day')
            })
        }

        public onCloseSessionClick(): void {
            $('#closeSessionModal').modal()
        }

        public onCloseSessionConfirm(): void {
            this.$store.dispatch(Actions.CLOSE_SESSION)
        }

        public openOptionsModal(): void {
            this.options = Object.assign({}, this.storeOptions)
            $('#optionsModal').modal()
        }

        public onOptionsModalSave(): void {
            this.storeOptions = this.options
        }

        public openImportModal(): void {
            this.solveImporter = new SolveImporter(this.$store.state.userId)
            $('#importModal').modal()
        }

        public validateImportText(): void {
            this.importTextValid = this.solveImporter?.validate(this.importText) || false
        }

        public runImport(): void {
            if (this.importTextValid) {
                this.solveImporter?.import(this.importText)
            } else {
                alert('Invalid JSON entered.')
                return
            }
        }

        public logout(): void {
            auth()
                .signOut()
                .then(() => this.$router.push('/login'))
                .catch((error: Error) => alert(error.message))
        }
    }
</script>
<style>
    pre {
        text-align: left;
    }
    .modal-body textarea {
        width: 100%;
        height: 25vh;
    }
</style>
