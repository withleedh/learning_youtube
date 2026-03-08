export function ScriptInputField(props: {
  label: string;
  value: string | number;
  onChange(value: string): void;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <label className="script-field">
      <span>{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={String(props.value ?? '')}
        placeholder={props.placeholder}
        onChange={(event) => {
          props.onChange(event.target.value);
        }}
      />
    </label>
  );
}

export function ScriptTextareaField(props: {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
}) {
  return (
    <label className="script-field script-field-wide">
      <span>{props.label}</span>
      <textarea
        spellCheck={false}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => {
          props.onChange(event.target.value);
        }}
      />
    </label>
  );
}

export function ScriptSelectField<T extends string>(props: {
  label: string;
  value: T;
  options: T[];
  onChange(value: T): void;
}) {
  return (
    <label className="script-field">
      <span>{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => {
          props.onChange(event.target.value as T);
        }}
      >
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
