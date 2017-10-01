import * as firebase from 'firebase';
import * as $ from 'jquery';
import * as Mutations from '../store/MutationTypes';
import * as Actions from '../store/ActionTypes';

export default {
    data: function() {
        return {
            showTimer: true,
            timerTrigger: 'spacebar'
        }
    },
    computed: {
        activeTab: {
            get() {
                return this.$store.state.activeView;
            },
            set(value) {
                this.$store.commit(Mutations.SET_ACTIVE_VIEW, value);
            }
        },
        puzzles() {
            return this.$store.state.puzzles;
        },
        activePuzzle: {
            get() {
                return this.$store.state.activePuzzle;
            },
            set(value) {
                this.$store.dispatch(Actions.SET_ACTIVE_PUZZLE, { puzzle: value, category: 'default' });
            }
        },
        activeCategory: {
            get() {
                return this.$store.state.activeCategory;
            },
            set(value) {
                this.$store.dispatch(Actions.SET_ACTIVE_PUZZLE, { puzzle: this.activePuzzle, category: value });
            }
        },
        storeOptions: {
            get() {
                return this.$store.state.options;
            },
            set(value) {
                this.$store.dispatch(Actions.SET_OPTIONS, value);
            }
        }
    },
    methods: {
        onCloseSessionClick() {
            $('#closeSessionModal').modal();
        },
        onCloseSessionConfirm() {
            this.$store.dispatch(Actions.CLOSE_SESSION);
        },
        openOptionsModal() {
            this.showTimer = this.storeOptions.showTimer;
            this.timerTrigger = this.storeOptions.timerTrigger;
            $('#optionsModal').modal();
        },
        onOptionsModalSave() {
            this.storeOptions = {
                showTimer: this.showTimer,
                timerTrigger: this.timerTrigger
            };
        },
        logout() {
            firebase.auth().signOut().catch(error => alert(error.message));
        }
    }
}