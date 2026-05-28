(function() {
  'use strict';

  function PremiumAnnouncementBar(container) {
    this.container = container;
    this.sectionId = container.getAttribute('data-section-id');
    this.displayMode = container.getAttribute('data-display-mode') || 'slider';
    this.autoRotate = container.getAttribute('data-auto-rotate') === 'true';
    this.rotateSpeed = parseInt(container.getAttribute('data-rotate-speed'), 10) || 5;
    this.pauseOnHover = container.getAttribute('data-pause-on-hover') === 'true';
    this.dismissedKey = container.getAttribute('data-dismissed-key');
    this.marqueeSpeed = parseInt(container.getAttribute('data-marquee-speed'), 10) || 40;

    this.currentIndex = 0;
    this.slideCount = 0;
    this.rotateTimer = null;
    this.countdownIntervals = [];
    this.isPaused = false;
    this.isDesignMode = !!(window.Shopify && window.Shopify.designMode);

    this.slides = [];
    this.dots = [];
    this.progressBar = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.closeBtn = null;
    this.marqueeTrack = null;
    this.slidesContainer = null;

    this._boundHandlers = {};

    this.init();
  }

  PremiumAnnouncementBar.prototype.init = function() {
    if (this.checkDismissed()) {
      return;
    }

    this.slides = this.container.querySelectorAll('.sab-slide');
    this.slideCount = this.slides.length;
    this.dots = this.container.querySelectorAll('.sab-dot');
    this.progressBar = this.container.querySelector('.sab-progress__bar');
    this.prevBtn = this.container.querySelector('.sab-arrow--prev');
    this.nextBtn = this.container.querySelector('.sab-arrow--next');
    this.closeBtn = this.container.querySelector('.sab-close');
    this.marqueeTrack = this.container.querySelector('.sab-marquee-track');
    this.slidesContainer = this.container.querySelector('.sab-slides-container');

    if (this.displayMode === 'slider') {
      this.initSlider();
    } else if (this.displayMode === 'marquee') {
      this.initMarquee();
    }

    this.initCountdowns();
    this.bindEvents();
  };

  PremiumAnnouncementBar.prototype.checkDismissed = function() {
    if (this.isDesignMode) {
      return false;
    }
    if (this.dismissedKey && localStorage.getItem(this.dismissedKey) === '1') {
      this.container.classList.add('sab-hidden');
      return true;
    }
    return false;
  };

  PremiumAnnouncementBar.prototype.initSlider = function() {
    if (this.slideCount === 0) return;

    for (var i = 0; i < this.slides.length; i++) {
      if (i === 0) {
        this.slides[i].classList.add('sab-slide--active');
        this.slides[i].setAttribute('aria-hidden', 'false');
      } else {
        this.slides[i].classList.remove('sab-slide--active');
        this.slides[i].setAttribute('aria-hidden', 'true');
      }
    }

    this.updateDots();

    if (this.autoRotate && this.slideCount > 1) {
      this.startAutoRotate();
    }
  };

  PremiumAnnouncementBar.prototype.initMarquee = function() {
    if (!this.marqueeTrack) return;

    var originalContent = this.marqueeTrack.innerHTML;
    this.marqueeTrack.innerHTML = originalContent + originalContent;

    this._calcMarqueeDuration();

    if (this.pauseOnHover) {
      var self = this;
      this._boundHandlers.marqueeEnter = function() {
        self.marqueeTrack.style.animationPlayState = 'paused';
      };
      this._boundHandlers.marqueeLeave = function() {
        self.marqueeTrack.style.animationPlayState = 'running';
      };
      this.marqueeTrack.addEventListener('mouseenter', this._boundHandlers.marqueeEnter);
      this.marqueeTrack.addEventListener('mouseleave', this._boundHandlers.marqueeLeave);
    }

    var self = this;
    this._resizeTimeout = null;
    this._boundHandlers.resize = function() {
      if (self._resizeTimeout) return;
      self._resizeTimeout = setTimeout(function() {
        self._resizeTimeout = null;
        self._calcMarqueeDuration();
      }, 150);
    };
    window.addEventListener('resize', this._boundHandlers.resize);
  };

  PremiumAnnouncementBar.prototype._calcMarqueeDuration = function() {
    if (!this.marqueeTrack) return;
    var trackWidth = this.marqueeTrack.scrollWidth / 2;
    var duration = trackWidth / this.marqueeSpeed;
    this.marqueeTrack.style.animation = 'sab-marquee ' + duration + 's linear infinite';
  };

  PremiumAnnouncementBar.prototype.goToSlide = function(index) {
    if (this.slideCount === 0) return;

    index = ((index % this.slideCount) + this.slideCount) % this.slideCount;

    for (var i = 0; i < this.slides.length; i++) {
      if (i === index) {
        this.slides[i].classList.add('sab-slide--active');
        this.slides[i].setAttribute('aria-hidden', 'false');
      } else {
        this.slides[i].classList.remove('sab-slide--active');
        this.slides[i].setAttribute('aria-hidden', 'true');
      }
    }

    this.currentIndex = index;
    this.updateDots();
    this.resetProgressBar();
  };

  PremiumAnnouncementBar.prototype.startAutoRotate = function() {
    if (this.displayMode !== 'slider' || this.slideCount <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var self = this;
    this.stopAutoRotate();
    this.resetProgressBar();

    this.rotateTimer = setInterval(function() {
      self.goToSlide(self.currentIndex + 1);
    }, this.rotateSpeed * 1000);
  };

  PremiumAnnouncementBar.prototype.stopAutoRotate = function() {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
  };

  PremiumAnnouncementBar.prototype.resetAutoRotate = function() {
    if (this.autoRotate && this.displayMode === 'slider' && !this.isPaused) {
      this.startAutoRotate();
    }
  };

  PremiumAnnouncementBar.prototype.resetProgressBar = function() {
    if (!this.progressBar) return;
    if (!this.autoRotate || this.displayMode !== 'slider') return;

    this.progressBar.style.transition = 'none';
    this.progressBar.style.width = '0%';
    // Force reflow
    void this.progressBar.offsetWidth;
    this.progressBar.style.transition = 'width ' + this.rotateSpeed + 's linear';
    this.progressBar.style.width = '100%';
  };

  PremiumAnnouncementBar.prototype.updateDots = function() {
    for (var i = 0; i < this.dots.length; i++) {
      if (i === this.currentIndex) {
        this.dots[i].classList.add('sab-dot--active');
        this.dots[i].setAttribute('aria-current', 'true');
      } else {
        this.dots[i].classList.remove('sab-dot--active');
        this.dots[i].removeAttribute('aria-current');
      }
    }
  };

  PremiumAnnouncementBar.prototype.initCountdowns = function() {
    var countdowns = this.container.querySelectorAll('.sab-countdown');
    var self = this;

    for (var i = 0; i < countdowns.length; i++) {
      (function(el) {
        var endDate = el.getAttribute('data-countdown-end');
        if (!endDate) return;

        var target = new Date(endDate).getTime();
        var values = el.querySelectorAll('.sab-countdown__value');

        function updateCountdown() {
          var now = Date.now();
          var diff = target - now;

          if (diff <= 0) {
            for (var v = 0; v < values.length; v++) {
              values[v].textContent = '0';
            }
            clearInterval(interval);
            return;
          }

          var days = Math.floor(diff / (1000 * 60 * 60 * 24));
          var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          var seconds = Math.floor((diff % (1000 * 60)) / 1000);

          if (values[0]) values[0].textContent = String(days);
          if (values[1]) values[1].textContent = String(hours);
          if (values[2]) values[2].textContent = String(minutes);
          if (values[3]) values[3].textContent = String(seconds);
        }

        updateCountdown();
        var interval = setInterval(updateCountdown, 1000);
        self.countdownIntervals.push(interval);
      })(countdowns[i]);
    }
  };

  PremiumAnnouncementBar.prototype.bindEvents = function() {
    var self = this;

    // Close button
    if (this.closeBtn) {
      this._boundHandlers.close = function() {
        self.container.classList.add('sab-hidden');
        if (self.dismissedKey) {
          localStorage.setItem(self.dismissedKey, '1');
        }
        self.stopAutoRotate();
        for (var i = 0; i < self.countdownIntervals.length; i++) {
          clearInterval(self.countdownIntervals[i]);
        }
      };
      this.closeBtn.addEventListener('click', this._boundHandlers.close);
    }

    // Arrow navigation
    if (this.prevBtn) {
      this._boundHandlers.prev = function() {
        self.goToSlide(self.currentIndex - 1);
        self.resetAutoRotate();
      };
      this.prevBtn.addEventListener('click', this._boundHandlers.prev);
    }

    if (this.nextBtn) {
      this._boundHandlers.next = function() {
        self.goToSlide(self.currentIndex + 1);
        self.resetAutoRotate();
      };
      this.nextBtn.addEventListener('click', this._boundHandlers.next);
    }

    // Dot navigation
    for (var i = 0; i < this.dots.length; i++) {
      (function(dot) {
        var handler = function() {
          var index = parseInt(dot.getAttribute('data-dot-index'), 10);
          self.goToSlide(index);
          self.resetAutoRotate();
        };
        dot.addEventListener('click', handler);
        if (!self._boundHandlers.dots) self._boundHandlers.dots = [];
        self._boundHandlers.dots.push({ el: dot, handler: handler });
      })(this.dots[i]);
    }

    // Keyboard navigation
    this._boundHandlers.keydown = function(e) {
      if (self.displayMode !== 'slider') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        self.goToSlide(self.currentIndex - 1);
        self.resetAutoRotate();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        self.goToSlide(self.currentIndex + 1);
        self.resetAutoRotate();
      }
    };
    this.container.setAttribute('tabindex', '0');
    this.container.addEventListener('keydown', this._boundHandlers.keydown);

    // Pause on hover (slider mode)
    if (this.pauseOnHover && this.displayMode === 'slider') {
      this._boundHandlers.sliderEnter = function() {
        self.isPaused = true;
        self.stopAutoRotate();
        if (self.progressBar) {
          self.progressBar.style.animationPlayState = 'paused';
          var computed = window.getComputedStyle(self.progressBar);
          var currentWidth = computed.width;
          self.progressBar.style.transition = 'none';
          self.progressBar.style.width = currentWidth;
        }
      };
      this._boundHandlers.sliderLeave = function() {
        self.isPaused = false;
        if (self.autoRotate) {
          self.startAutoRotate();
        }
      };
      this.container.addEventListener('mouseenter', this._boundHandlers.sliderEnter);
      this.container.addEventListener('mouseleave', this._boundHandlers.sliderLeave);
    }
  };

  PremiumAnnouncementBar.prototype.destroy = function() {
    this.stopAutoRotate();

    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = null;
    }

    for (var i = 0; i < this.countdownIntervals.length; i++) {
      clearInterval(this.countdownIntervals[i]);
    }
    this.countdownIntervals = [];

    if (this.closeBtn && this._boundHandlers.close) {
      this.closeBtn.removeEventListener('click', this._boundHandlers.close);
    }
    if (this.prevBtn && this._boundHandlers.prev) {
      this.prevBtn.removeEventListener('click', this._boundHandlers.prev);
    }
    if (this.nextBtn && this._boundHandlers.next) {
      this.nextBtn.removeEventListener('click', this._boundHandlers.next);
    }
    if (this._boundHandlers.dots) {
      for (var i = 0; i < this._boundHandlers.dots.length; i++) {
        var d = this._boundHandlers.dots[i];
        d.el.removeEventListener('click', d.handler);
      }
    }
    if (this._boundHandlers.keydown) {
      this.container.removeEventListener('keydown', this._boundHandlers.keydown);
    }
    if (this._boundHandlers.sliderEnter) {
      this.container.removeEventListener('mouseenter', this._boundHandlers.sliderEnter);
    }
    if (this._boundHandlers.sliderLeave) {
      this.container.removeEventListener('mouseleave', this._boundHandlers.sliderLeave);
    }
    if (this._boundHandlers.marqueeEnter && this.marqueeTrack) {
      this.marqueeTrack.removeEventListener('mouseenter', this._boundHandlers.marqueeEnter);
    }
    if (this._boundHandlers.marqueeLeave && this.marqueeTrack) {
      this.marqueeTrack.removeEventListener('mouseleave', this._boundHandlers.marqueeLeave);
    }
    if (this._boundHandlers.resize) {
      window.removeEventListener('resize', this._boundHandlers.resize);
    }

    delete this.container._premiumAnnouncementBar;
  };

  // Initialize all instances
  function initAll() {
    document.querySelectorAll('[data-premium-announcement-bar]').forEach(function(el) {
      if (!el._premiumAnnouncementBar) {
        el._premiumAnnouncementBar = new PremiumAnnouncementBar(el);
      }
    });
  }

  initAll();

  // Shopify Theme Editor events
  document.addEventListener('shopify:section:load', function(e) {
    var sectionId = e.detail ? e.detail.sectionId : null;
    if (!sectionId) return;
    var container = document.querySelector('[data-premium-announcement-bar][data-section-id="' + sectionId + '"]');
    if (container) {
      if (container._premiumAnnouncementBar) {
        container._premiumAnnouncementBar.destroy();
      }
      container._premiumAnnouncementBar = new PremiumAnnouncementBar(container);
    } else {
      initAll();
    }
  });

  document.addEventListener('shopify:section:unload', function(e) {
    var sectionId = e.detail ? e.detail.sectionId : null;
    if (!sectionId) return;
    var container = document.querySelector('[data-premium-announcement-bar][data-section-id="' + sectionId + '"]');
    if (container && container._premiumAnnouncementBar) {
      container._premiumAnnouncementBar.destroy();
    }
  });

  document.addEventListener('shopify:section:select', function(e) {
    var sectionId = e.detail ? e.detail.sectionId : null;
    if (!sectionId) return;
    var container = document.querySelector('[data-premium-announcement-bar][data-section-id="' + sectionId + '"]');
    if (container) {
      container.classList.remove('sab-hidden');
    }
  });

  document.addEventListener('shopify:block:select', function(e) {
    var sectionId = e.detail ? e.detail.sectionId : null;
    var blockId = e.detail ? e.detail.blockId : null;
    if (!sectionId) return;
    var container = document.querySelector('[data-premium-announcement-bar][data-section-id="' + sectionId + '"]');
    if (!container || !container._premiumAnnouncementBar) return;

    var instance = container._premiumAnnouncementBar;
    instance.stopAutoRotate();

    // Find the slide matching this block
    if (blockId) {
      var slides = container.querySelectorAll('.sab-slide');
      for (var i = 0; i < slides.length; i++) {
        if (slides[i].getAttribute('data-block-id') === blockId) {
          instance.goToSlide(i);
          break;
        }
      }
    }
  });

  document.addEventListener('shopify:block:deselect', function(e) {
    var sectionId = e.detail ? e.detail.sectionId : null;
    if (!sectionId) return;
    var container = document.querySelector('[data-premium-announcement-bar][data-section-id="' + sectionId + '"]');
    if (!container || !container._premiumAnnouncementBar) return;

    var instance = container._premiumAnnouncementBar;
    if (instance.autoRotate && instance.displayMode === 'slider') {
      instance.startAutoRotate();
    }
  });

})();
