import {set, type StringInputProps} from 'sanity'

export function KnowledgeReindexInput(props: StringInputProps) {
  return (
    <div>
      <button type="button" disabled={props.readOnly} onClick={() => props.onChange(set(new Date().toISOString()))}
        style={{padding: '10px 14px', borderRadius: 4, border: '1px solid currentColor', cursor: 'pointer', background: 'transparent', color: 'inherit'}}>
        Request document reprocessing
      </button>
      {props.value ? <p style={{fontSize: 13}}>Requested: {props.value}</p> : null}
    </div>
  )
}
