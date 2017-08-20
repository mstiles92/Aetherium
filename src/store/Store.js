import * as firebase from 'firebase';
import * as firebaseConfig from '../../firebase.config';
import * as moment from 'moment';
import Vue from 'vue';
import Vuex from 'vuex';
import { Solve } from '../modules/Models';
import * as Stats from '../modules/Statistics';
import * as Mutations from './MutationTypes';
import * as Actions from './ActionTypes';
let ScramblerWorker = require('worker-loader?name=GenerateScramblerWorker.js!../workers/GenerateScramblerWorker.js');

const state = {
    userId: null,
    sessionId: null,
    puzzles: null,
    activeView: 'timer',
    activePuzzle: 333,
    activeCategory: 'default',
    solves: [],
    stats: null,
    scramblerWorker: new ScramblerWorker(),
    scramble: {
        text: 'Generating scramble...',
        svg: null
    },
    options: {
        showTimer: true,
        timerTrigger: 'spacebar'
    }
};

const getters = {
    puzzlesRef() {
        return firebase.database().ref('/puzzles');
    },
    userRef(state) {
        return firebase.database().ref(`/users/${state.userId}`);
    },
    solvesRootRef(state) {
        return firebase.database().ref(`/solves/${state.userId}`)
    },
    sessionRef(state, getters) {
        return getters.solvesRootRef.child(`${state.sessionId}`);
    },
    solvesRef(state, getters) {
        return getters.sessionRef.child(`solves/${state.activePuzzle}/${state.activeCategory}`);
    },
    statsRootRef(state) {
        return firebase.database().ref(`/stats/${state.userId}`);
    },
    statsRef(state, getters) {
        return getters.statsRootRef.child(`${state.activePuzzle}/${state.activeCategory}/${state.sessionId}`);
    }
};

const mutations = {
    [Mutations.RECEIVE_USER_ID] (state, userId) {
        state.userId = userId;
    },
    [Mutations.RECEIVE_SESSION_ID] (state, sessionId) {
        state.sessionId = sessionId;
    },
    [Mutations.RECEIVE_PUZZLES] (state, puzzles) {
        state.puzzles = puzzles;
    },
    [Mutations.SET_ACTIVE_VIEW] (state, newView) {
        state.activeView = newView;
    },
    [Mutations.RECEIVE_ACTIVE_PUZZLE] (state, payload) {
        state.activePuzzle = payload.puzzle;
        state.activeCategory = payload.category;
    },
    [Mutations.RECEIVE_SCRAMBLE] (state, scramble) {
        state.scramble = scramble;
    },
    [Mutations.SET_OPTION_SHOWTIMER] (state, showTimer) {
        state.options.showTimer = showTimer;
    },
    [Mutations.SET_OPTION_TIMERTRIGGER] (state, timerTrigger) {
        state.options.timerTrigger = timerTrigger;
    },
    [Mutations.CLEAR_SOLVES] (state) {
        state.solves = [];
    },
    [Mutations.ADD_SOLVE] (state, solve) {
        state.solves.push(solve);
    },
    [Mutations.UPDATE_SOLVE] (state, payload) {
        Vue.set(state.solves, state.solves.findIndex(solve => solve.uid === payload.uid), payload.solve);
    },
    [Mutations.DELETE_SOLVE] (state, solveId) {
        state.solves.splice(state.solves.findIndex(solve => solve.uid = solveId), 1);
    },
    [Mutations.RECEIVE_STATS] (state, stats) {
        state.stats = stats;
    }
};

const actions = {
    [Actions.SET_OPTIONS] (context, payload) {
        context.getters.userRef.child('options').set(payload);
    },
    [Actions.SET_ACTIVE_PUZZLE] (context, payload) {
        context.getters.userRef.child('currentPuzzle').set({ puzzle: payload.puzzle, category: payload.category });
    },
    [Actions.REQUEST_SCRAMBLE] (context) {
        context.commit(Mutations.RECEIVE_SCRAMBLE, { text: null, svg: null });
        context.state.scramblerWorker.postMessage({
            scrambler: context.state.puzzles[context.state.activePuzzle].categories[context.state.activeCategory].scrambler
        })
    },
    [Actions.CHECK_SESSION] (context) {
        return new Promise((resolve, reject) => {
            if (!context.state.sessionId) {
                const date = moment().utc().dayOfYear(moment().dayOfYear()).startOf('day');
                const newSessionRef = context.getters.solvesRootRef.push();

                context.getters.userRef.child('currentSessionId').set(newSessionRef.key).then(() => {
                    newSessionRef.set({
                        date: date.format('M/D/YYYY'),
                        timestamp: date.valueOf()
                    });

                    context.getters.statsRef.set({
                        date: date.format('M/D/YYYY'),
                        timestamp: date.valueOf()
                    });

                    resolve();
                });
            } else {
                resolve();
            }
        });
    },
    [Actions.CLOSE_SESSION] (context) {
        context.getters.userRef.child('currentSessionId').set(null);
    },
    [Actions.STORE_SOLVE] (context, delta) {
        context.dispatch(Actions.CHECK_SESSION).then(() => {
            context.getters.solvesRef.push().set({
                time: delta,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                scramble: context.state.scramble.text,
                penalty: ''
            }).then(() => context.dispatch(Actions.UPDATE_STATS));

            context.dispatch(Actions.REQUEST_SCRAMBLE);
        });
    },
    [Actions.SET_PENALTY] (context, update) {
        const newPenalty = (update.solve.penalty === update.penalty) ? '' : update.penalty;
        context.getters.solvesRef.child(update.solve.uid).update({penalty : newPenalty}).then(() => context.dispatch(Actions.UPDATE_STATS));
    },
    [Actions.DELETE_SOLVE] (context, solveId) {
        context.getters.solvesRef.child(solveId).remove().then(() => context.dispatch(Actions.UPDATE_STATS));
    },
    [Actions.UPDATE_STATS] (context) {
        context.getters.statsRef.update({
            mean: Stats.mean(context.state.solves),
            count: Stats.count(context.state.solves),
            best: Stats.best(context.state.solves),
            worst: Stats.worst(context.state.solves),
            stdDev: Stats.stdDev(context.state.solves),
            mo3: Stats.mo3(context.state.solves),
            ao5: Stats.ao5(context.state.solves),
            ao12: Stats.ao12(context.state.solves),
            ao50: Stats.ao50(context.state.solves),
            ao100: Stats.ao100(context.state.solves),
            bestMo3: Stats.bestMo3(context.state.solves),
            bestAo5: Stats.bestAo5(context.state.solves),
            bestAo12: Stats.bestAo12(context.state.solves),
            bestAo50: Stats.bestAo50(context.state.solves),
            bestAo100: Stats.bestAo100(context.state.solves)
        });
    }
};

const plugins = [
    store => firebase.auth().onAuthStateChanged(user => {
        store.commit(Mutations.RECEIVE_USER_ID, user ? user.uid : null);
    }),
    store => store.state.scramblerWorker.addEventListener('message', event => {
        if (event.data === null) {
            store.commit(Mutations.RECEIVE_SCRAMBLE, { text: 'No valid scrambler for this puzzle', svg: null });
        } else {
            store.commit(Mutations.RECEIVE_SCRAMBLE, { text: event.data.scramble, svg: event.data.svg });
        }
    }),
    store => store.getters.puzzlesRef.on('value', snapshot => {
        store.commit(Mutations.RECEIVE_PUZZLES, snapshot.val());
    }),
    store => {
        let prevUserId = store.state.userId;

        store.subscribe((mutation, state) => {
            if (mutation.type === Mutations.RECEIVE_USER_ID) {
                firebase.database().ref(`/users/${prevUserId}/options`).off();
                firebase.database().ref(`/users/${prevUserId}/currentSessionId`).off();
                firebase.database().ref(`/users/${prevUserId}/currentPuzzle`).off();
                prevUserId = state.userId;

                if (state.userId) {
                    store.getters.userRef.child('options').on('value', snapshot => {
                        store.commit(Mutations.SET_OPTION_SHOWTIMER, snapshot.val().showTimer);
                        store.commit(Mutations.SET_OPTION_TIMERTRIGGER, snapshot.val().timerTrigger);
                    });

                    store.getters.userRef.child('currentSessionId').on('value', snapshot => {
                        store.commit(Mutations.RECEIVE_SESSION_ID, snapshot.val());
                    });

                    store.getters.userRef.child('currentPuzzle').on('value', snapshot => {
                        store.commit(Mutations.RECEIVE_ACTIVE_PUZZLE, snapshot.val());
                    });
                }
            }
        });
    },
    store => {
        let prevPuzzle = store.state.activePuzzle;
        let prevCategory = store.state.activeCategory;

        store.subscribe((mutation, state) => {
            if (mutation.type === Mutations.RECEIVE_ACTIVE_PUZZLE) {
                store.getters.sessionRef.child(`solves/${prevPuzzle}/${prevCategory}`).off();
                store.getters.solvesRootRef.child(`${prevPuzzle}/${prevCategory}/${store.state.userId}`).off();
                prevPuzzle = state.activePuzzle;
                prevCategory = state.activeCategory;

                store.commit(Mutations.CLEAR_SOLVES);

                store.getters.solvesRef.on('child_added', snapshot => {
                    store.commit(Mutations.ADD_SOLVE, Solve.fromSnapshot(snapshot));
                });

                store.getters.solvesRef.on('child_changed', snapshot => {
                    store.commit(Mutations.UPDATE_SOLVE, { uid: snapshot.key, solve: Solve.fromSnapshot(snapshot) });
                });

                store.getters.solvesRef.on('child_removed', snapshot => {
                    store.commit(Mutations.DELETE_SOLVE, snapshot.key);
                });

                store.getters.statsRef.on('value', snapshot => {
                    store.commit(Mutations.RECEIVE_STATS, snapshot.val());
                });

                store.dispatch(Actions.REQUEST_SCRAMBLE);
            }
        });
    },
    store => store.subscribe((mutation, state) => {
        console.log(mutation.type);
        console.log(mutation.payload);
    })
];

try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error(e);
}

Vue.use(Vuex);

export default new Vuex.Store({
    state,
    getters,
    mutations,
    actions,
    plugins,
    strict: true //TODO: disable this before deploying to production
})