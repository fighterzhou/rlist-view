import React, { Component } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types'
import './rlist-view.css';

function isDragDown(prevY, curY) {
  return curY - prevY > 0;
}

function isIphone() {
  return /iphone/i.test(window.navigator.userAgent);
}

export default class RListView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      translateY: 0,
      transition: false,
      topPosition: 100
    };
    // bind this
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onScroll = this.onScroll.bind(this);

    this.startYPos = 0;
    this.prevYPos = 0;
    this.rootDom = null;
    this.refreshDom = null;
    this.scrollTarget = null;
    this.isRefreshing = true;
    this.isPulling = false;
    this.isLoadingMore = false;
  }
  componentDidMount() {
    this.rootDom.addEventListener('touchmove', this.onTouchMove, false);

    // move out viewport
    this.setState({
      topPosition: -this.refreshDom.clientHeight
    });
    // init refresh
    this.refresh(false);

    if (this.props.useWindowScroll) {
      this.listendScroll(window);
    } else {
      this.listendScroll(this.rootDom);
    }
  }
  onTouchStart(e) {
    this.startYPos = this.prevYPos = e.touches[0].pageY;
  }
  onTouchMove(e) {
    // do noting when is refreshing
    if (this.isRefreshing) return;
    
    const curYpos = e.touches[0].pageY;
    const scrollTop = this.rootDom.scrollTop

    if (
      (scrollTop === 0 && isDragDown(this.prevYPos, curYpos)) || this.isPulling
    ) {
      e.preventDefault();
      this.setState({
        translateY: this.calcDistance(curYpos - this.startYPos),
        transition: false
      });
      this.isPulling = true;
    }
    this.prevYPos = curYpos
  }
  onTouchEnd() {
    if (this.isRefreshing) return;
    if (this.shouldRefresh) {
      this.refresh();
    } else {
      this.resetPosition();
    }
    this.isPulling = false;
  }
  onScroll() {
    if (this.isLoadingMore) return;
    if (this.arriveBottom()) {
      this.isLoadingMore = true;
      this.props.loadMore()
        .then(() => this.isLoadingMore = false);
    }
  }
  arriveBottom() {
    const props = this.props;
    const target = this.scrollTarget;
    const visibleHeight = props.useWindowScroll ? window.innerHeight : target.clientHeight;
    const scrollTop = props.useWindowScroll ? window.pageYOffset : target.scrollTop;
    const scrollHeight = props.useWindowScroll ? document.documentElement.scrollHeight : target.scrollHeight;
    return (scrollHeight - (scrollTop + visibleHeight) <= props.threshold);
  }
  calcDistance(distance) {
    return distance / 3;
  }
  get shouldRefresh() {
    return this.state.translateY >= this.refreshDom.clientHeight;
  }
  get progress() {
    if (this.refreshDom) {
      return Math.min(this.state.translateY / this.refreshDom.clientHeight * 100, 100)
    }
    return 0;
  }
  refresh(transition = true) {
    const props = this.props;
    this.setState({
      translateY: this.refreshDom.clientHeight,
      transition
    });

    this.isRefreshing = true;
    props
      .refresh()
      .then(() => {
        this.resetPosition();
        this.isRefreshing = false;
      });
  }
  resetPosition() {
    this.setState({
      translateY: 0,
      transition: true
    });
  }
  listendScroll(target) {
    this.scrollTarget = target;
    target.addEventListener('scroll', this.onScroll);
  }
  render() {
    const props = this.props;
    const state = this.state;
    return (
      <div
        className={classNames('rlist-view-component', {
          'ios-local-scroll-fix': isIphone()
        })}
        style={{
          height: props.height
        }}
        ref={ref => this.rootDom = ref}
        onTouchStart={this.onTouchStart}
        onTouchEnd={this.onTouchEnd}
      >
        <div
          ref={ref => this.refreshDom = ref}
          className={classNames('rlist-view-component__refresh', {
            'ease-out-transion': state.transition
          })}
          style={{
            transform: `translate3d(0,0${state.translateY}px,0)`,
            top: `${state.topPosition}px`
          }}
        >
          {
            React.createElement(props.refreshComponent, {
              isRefreshing: this.isRefreshing,
              progress: this.progress
            })
          }
        </div>

        <div
          className={classNames('rlist-view-component__content', {
            'ease-out-transion': state.transition
          })}
          style={{
            transform: `translate3d(0,0${state.translateY}px,0)`
          }}
        >
          { props.children }
        </div>
      </div>
    );
  }
}

RListView.defaultProps = {
  threshold: 10,
  useWindowScroll: false
};

RListView.propTypes = {
  height: PropTypes.number.isRequired,
  refresh: PropTypes.func.isRequired,
  refreshComponent: PropTypes.func.isRequired,
  threshold: PropTypes.number,
  useWindowScroll: PropTypes.bool,
  loadMore: PropTypes.func.isRequired
}