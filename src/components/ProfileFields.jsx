import React from "react";
const genders = ["Woman", "Man", "Nonbinary"];
export const blankProfile = {
  name: "",
  age: 25,
  gender: "Nonbinary",
  desired: [...genders],
  city: "",
  bio: "",
  interests: "",
};
export function ProfileFields({ value, setValue }) {
  const field = (key) => ({
    value: value[key],
    onChange: (e) =>
      setValue({
        ...value,
        [key]: key === "age" ? Number(e.target.value) : e.target.value,
      }),
  });
  return (
    <>
      <div className="form-grid">
        <label>
          Name
          <input
            required
            maxLength={60}
            autoComplete="given-name"
            {...field("name")}
          />
        </label>
        <label>
          Age
          <input type="number" min="18" max="110" required {...field("age")} />
        </label>
        <label>
          Gender
          <select {...field("gender")}>
            {genders.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label>
          City or region
          <input
            maxLength={80}
            autoComplete="address-level2"
            {...field("city")}
          />
        </label>
      </div>
      <fieldset>
        <legend>I’m interested in meeting</legend>
        <div className="check-row">
          {genders.map((g) => (
            <label key={g}>
              <input
                type="checkbox"
                checked={value.desired.includes(g)}
                onChange={(e) =>
                  setValue({
                    ...value,
                    desired: e.target.checked
                      ? [...value.desired, g]
                      : value.desired.filter((v) => v !== g),
                  })
                }
              />
              {g === "Woman"
                ? "Women"
                : g === "Man"
                  ? "Men"
                  : "Nonbinary people"}
            </label>
          ))}
        </div>
        <p className="micro">
          People appear only when both members’ gender preferences align.
        </p>
      </fieldset>
      <label>
        About you
        <textarea
          rows="4"
          maxLength={1200}
          placeholder="A few things that make your life yours…"
          {...field("bio")}
        />
      </label>
      <label>
        A few interests
        <input
          maxLength={160}
          placeholder="Gardening · Books · Sunday walks"
          {...field("interests")}
        />
      </label>
    </>
  );
}
