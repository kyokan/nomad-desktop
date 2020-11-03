import React, {ReactElement} from "react";
import Icon from "../Icon";
import StarIcon from "../../../../static/assets/icons/star.svg";
import UnstarIcon from "../../../../static/assets/icons/unstar.svg";
import './topic.scss'
import Menuable from "../Menuable";
import { withRouter, RouteComponentProps } from "react-router";
import {useDispatch} from "react-redux";
import {addFavoriteTopic, removeFavoriteTopic, useTopics} from "../../ducks/fav";
import c from 'classnames';

type Props = {
  className?: string;
  text: string;
}

function Topic(props: Props & RouteComponentProps): ReactElement {
  const {
    text,
    className = '',
    history,
  } = props;

  const dispatch = useDispatch();
  const topicsMap: {[topic: string]: string} = useTopics().reduce((acc, t) => ({ ...acc, [t]: t}), {});
  let displayText: string = text;
  let isHidden = false;

  if (!text) {
    return <noscript />;
  }

  if (text[0] === '.') {
    displayText = 'hidden';
    isHidden = true;
  }

  return (
    <Menuable
      items={[
        {
          text: topicsMap[text] ? 'Remove Favorite' : 'Add Favorite',
          iconUrl: topicsMap[text] ? StarIcon : UnstarIcon,
          onClick: topicsMap[text]
            ? () => dispatch(removeFavoriteTopic(text))
            : () => dispatch(addFavoriteTopic(text))
        },
        { divider: true },
        {
          text: `Go to ${text}`,
          onClick: () => history.push(`/topics/${text}`),
        },
      ]}
    >
      <div
        key={`topic-${text}`}
        className={c('topic', className, {
          'topic--favorite': topicsMap[text],
          'topic--hidden': isHidden,
        })}
      >
        {
          !isHidden && (
            <Icon
              url={topicsMap[text] ? StarIcon : UnstarIcon}
              width={12}
            />
          )
        }
        <div className='topic__text'>
          {displayText}
        </div>
      </div>
    </Menuable>
  );
}

export default withRouter(Topic);
