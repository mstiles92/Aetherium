import { SolvePayload, StatisticsPayload } from '@/types/firebase'

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface ISolve extends SolvePayload {
    uid: string

    readonly finalTime: number
    readonly formattedTime: string
    readonly formattedTimeShort: string
    readonly formattedTimestamp: string
}

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface ISession {
    solves: ISolve[]
    stats: Statistics

    addSolve: (solve: ISolve) => void
    updateSolve: (solveUid: string, data: SolvePayload) => void
    deleteSolve: (solveUid: string) => void
}

export interface Statistics extends StatisticsPayload {
    date?: string
}

export interface ThemeData {
    name: string
    url: string
}

export interface TimerStateMachineOptions {
    holdToStart: boolean
    useInspection: boolean
    onSolveStart: () => void
    onSolveComplete: () => void
    onInspectionStart: () => void
}

export enum TimerState {
    IDLE = 'idle',
    INSPECTION = 'inspection',
    STARTING = 'starting',
    READY = 'ready',
    RUNNING = 'running',
    COMPLETE = 'complete'
}

export type ChartSeries = Array<[number, number]>
