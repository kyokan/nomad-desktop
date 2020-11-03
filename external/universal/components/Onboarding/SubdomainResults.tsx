// @ts-ignore
import React, {ReactElement, useCallback, useEffect, useState} from "react";
// @ts-ignore
import {withRouter, RouteComponentProps, Redirect} from "react-router";
// @ts-ignore
import c from 'classnames';
import Icon from "../Icon";
import Input from "../Input";
import Button from "../Button";
import {OnboardingViewType} from "./index";

type SubdomainResultsProps = {
  query: string;
  onQueryChange: (username: string) => void;
  onUsernameChange: (username: string) => void;
  onSearch: (username: string) => Promise<string[]>;
  setViewType: (viewType: OnboardingViewType) => void;
} & RouteComponentProps;

export default withRouter(SubdomainResults);
function SubdomainResults(props: SubdomainResultsProps): ReactElement {
  const {
    query,
    onQueryChange,
    setViewType,
    onSearch,
  } = props;

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [subdomain, setSubdomain] = useState(query);
  const [selected, setSelected] = useState('');

  const search = useCallback(async () => {
    setLoading(true);
    setResults([]);
    setSubdomain(query);

    try {
      const res = await onSearch(query);
      setResults(res);
    } catch (err) {
      setResults([]);
      setErrorMessage(err.message);
    }

    setLoading(false);
  }, [query]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      search();
    }
  }, [search]);

  useEffect(() => {
    (async function onSubdomainResultsMount() {
      if (query) {
        await search();
      }
    })();
  }, []);

  return (
    <div className="onboarding">
      <div className="onboarding__panel">
        <div className="onboarding__panel__title">
          <Icon
            material="arrow_back"
            width={18}
            onClick={() => setViewType(OnboardingViewType.FIND_A_DOMAIN)}
          />
          <Input
            className={c('onboarding__input', 'onboarding__search-input', {
              'onboarding__input--error': errorMessage,
            })}
            type="text"
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            value={query}
            placeholder="Find your domain name"
            iconFn={() => {
              return (
                <Icon
                  material="search"
                  width={18}
                  disabled={isLoading || !query}
                  onClick={search}
                />
              )
            }}
          />
        </div>
        <div className="onboarding__search-results">
          {
            !results
              ? 'No Results'
              : results.map(tld => (
                <div
                  className={c('onboarding__search-results__row', {
                    'onboarding__search-results__row--selected': selected === `${subdomain}.${tld}`,
                  })}
                  onClick={() => setSelected(`${subdomain}.${tld}`)}
                >
                  <div className="onboarding__search-results__row__text">
                    {`${subdomain}.${tld}`}
                  </div>
                  <Icon
                    width={18}
                    material="check"
                  />
                </div>
              ))
          }
        </div>
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
        <div className="onboarding__panel__footer">
          <Button
            disabled={!selected}
            onClick={() => {
              props.onUsernameChange(selected);
              setViewType(OnboardingViewType.SIGNUP);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
