export const en = {
  global: {
    buttons: { cancel: 'Cancel', save: 'Save' },
    loading: 'Loading…',
    api_error:
      'Cannot load data from the server. Run the backend on port 3000: pnpm --filter backend dev',
    api_retry: 'Retry',
    months: {
      january: 'January',
      february: 'February',
      march: 'March',
      april: 'April',
      may: 'May',
      june: 'June',
      july: 'July',
      august: 'August',
      september: 'September',
      october: 'October',
      november: 'November',
      december: 'December'
    }
  },
  campaign_workflow: {
    page_title: 'Automation Workflows',
    hero_title_before: 'Automate ',
    hero_title_after: ' customer journeys',
    hero_secondary_cta: 'View metrics',
    page_lead:
      'Activate, nurture, and retain customers with Email, SMS, RCS, and Voice journeys.',
    page_subtitle: 'Showing {count} / {total} workflows',
    search_placeholder: 'Search by name or description...',
    all_categories: 'All categories',
    active: 'Active',
    inactive: 'Inactive',
    edit_steps: 'Edit steps',
    steps: '{count} steps',
    empty_description: 'No description available for this workflow.',
    categories: {
      activation: 'Activation',
      qualification: 'Qualification',
      nurturing: 'Nurturing',
      loyalty: 'Loyalty',
      abandoned_basket: 'Abandoned Basket',
      reactivation: 'Reactivation',
      onboarding: 'Onboarding',
      retention: 'Retention'
    },
    stats: {
      total_workflows: 'Total Workflows',
      active: 'Active',
      total_steps: 'Total Steps',
      categories: 'Categories'
    },
    add_workflow_campaign: 'Add workflow campaign',
    create_with_ai: 'Create with AI',
    ai_badge: 'Created with AI',
    ai: {
      title: 'AI Workflow Builder',
      lead: 'Describe your customer journey in plain language. AI will design steps, delays, and message content.',
      prompt_placeholder:
        'e.g. Welcome new users with an email immediately, then SMS after 1 day with a special offer…',
      locale: 'Language',
      generate: 'Generate workflow',
      generating: 'Designing journey…',
      back: 'Back',
      continue: 'Continue',
      confirm_create: 'Create workflow',
      creating: 'Creating…',
      progress: 'Builder progress',
      step_describe: 'Describe',
      step_preview: 'Preview & edit',
      step_confirm: 'Confirm',
      source: 'Engine',
      source_lora: 'LoRA (fine-tuned)',
      source_rule_based: 'Rule-based',
      engine_loading: 'Loading AI model…',
      engine_ready_lora: 'LoRA model ready',
      engine_ready_rule_based: 'Rule-based engine (no GPU model)',
      engine_warmup_failed: 'Model warmup failed — rule-based fallback',
      engine_offline: 'ML service offline — rule-based fallback',
      generate_progress_check: 'Connecting to AI engine…',
      generate_progress_design: 'Designing your journey…',
      generate_progress_finalize: 'Finalizing steps and templates…',
      template_body: 'Message content',
      immediate: 'Immediately',
      confirm_lead: 'Review your AI-generated workflow before adding it to campaigns.',
      inactive_note:
        'The workflow will be added as inactive. Confirm each step in the editor before activating.',
      quick_onboarding:
        'Create a 3-step welcome journey: email immediately, SMS after 1 day, follow-up email after 3 days.',
      quick_abandoned:
        'Abandoned cart recovery: email after 1 hour, SMS after 24 hours, final email with discount after 72 hours.',
      quick_reactivation:
        'Win back inactive customers over 2 weeks with email and SMS reminders and a comeback offer.',
      quick_black_friday:
        'Black Friday campaign: teaser email 1 week before, launch day email and SMS, last-chance reminder after 2 days.',
      black_friday_label: 'Black Friday'
    },
    enroll_title: 'Add workflow to my campaigns',
    enroll_lead:
      'Pick a template. You can then set the contact list, channels, and templates for each step.',
    enroll_loading: 'Loading templates…',
    enroll_empty:
      'All available workflow templates are already in your list. Remove one to add it again.',
    enroll_pick: 'Workflow template',
    enroll_select_placeholder: 'Choose a template…',
    enroll_add: 'Add',
    remove_confirm_title: 'Remove workflow from campaigns',
    remove_workflow: 'Remove',
    confirm_remove_workflow:
      'Remove "{name}" from your campaigns? This deletes your configuration for this workflow.',
    grid_empty: 'You have no workflow campaigns yet.',
    grid_empty_cta: 'Add workflow campaign',
    edit_modal: {
      title: 'Edit Workflow',
      workflow_name: 'Workflow name',
      description: 'Description',
      description_placeholder: 'Short description of workflow objective...',
      close: 'Close',
      save_pending: 'Unsaved changes…',
      save_saving: 'Saving…',
      save_saved: 'Saved',
      save_error: 'Could not save',
      contacts: 'contacts',
      recipients: 'Recipients',
      all_contacts: 'All contacts',
      my_contact_lists: 'My contact lists',
      contact_list: 'Contact list',
      select_contact_list: 'Select a contact list...',
      workflow_steps: 'Workflow steps',
      start: 'Start',
      end: 'End',
      ai_step_badge: 'AI generated',
      template: 'Template',
      select_template: 'Select template...',
      email_from_address: 'From email',
      email_subject: 'Email subject',
      email_from_name: 'From name',
      delay: 'Delay before this step',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      unit_day: 'day',
      unit_hour: 'hour',
      unit_minute: 'minute',
      select_template_to_preview: 'Select a template to preview content.',
      preview_email: 'Email preview',
      preview_message: 'SMS preview',
      preview_rcs: 'RCS preview',
      preview_voice: 'Voice preview',
      preview_from: 'From',
      preview_subject: 'Subject',
      preview_sent: 'Sent',
      preview_now: 'Just now',
      preview_today: 'Today',
      preview_delivered: 'Delivered',
      preview_calling: 'Calling…',
      wait: 'Wait',
      sms_sender_id: 'SMS / RCS sender ID',
      sms_sender_id_hint: 'Alphanumeric sender shown to recipients.'
    }
  },
  campaign_auto_scheduler: {
    calendar_pin_title: 'Year-round calendar',
    calendar_pin_lead: 'Toggle events and tune channels as seasons shift.',
    edit: 'Edit',
    page_header: 'Campaign Auto Scheduler',
    page_subtitle:
      'Subscribe to calendar events, edit templates and send dates — the backend cron sends before each event.',
    api_offline_hint: 'Showing the calendar layout. Subscription status will sync when the API is available.',
    edit_modal: {
      title: 'Scheduler Event Details',
      channel: 'Channel',
      select_channel: 'Select channel...',
      template: 'Template',
      select_template: 'Select template...',
      recipients: 'Recipients',
      all_contacts: 'All contacts',
      my_contact_lists: 'My contact lists',
      contact_list: 'Contact list',
      select_contact_list: 'Select contact list...',
      contacts: 'contacts',
      send_date: 'Send date',
      days_before_at: 'days before at',
      send_date_preview: 'Will send on {date} at {time}'
    },
    events: {
      new_year: "New Year's Day",
      winter_sales: 'Winter Sales',
      mardi_gras: 'Mardi Gras',
      valentine: "Valentine's Day",
      womens_day: "Women's Day",
      st_patrick: "St. Patrick's Day",
      spring: 'Spring',
      easter_monday: 'Easter Monday',
      april_fools: 'April Fools',
      spring_sales: 'Spring Sales',
      earth_day: 'Earth Day',
      labor_day: 'Labor Day',
      mothers_day: "Mother's Day",
      spring_clearance: 'Spring Clearance',
      summer_kickoff: 'Summer Kickoff',
      fathers_day: "Father's Day",
      summer_solstice: 'Summer Solstice',
      summer_sales: 'Summer Sales',
      bastille: 'Bastille Day',
      mid_summer: 'Mid-Summer',
      summer_promo: 'Summer Promo',
      back_to_school: 'Back to School',
      end_summer: 'End of Summer',
      fall_launch: 'Fall Launch',
      mid_autumn: 'Mid-Autumn',
      autumn_equinox: 'Autumn Equinox',
      halloween_prep: 'Halloween Prep',
      halloween: 'Halloween',
      fall_sales: 'Fall Sales',
      black_friday_prep: 'Black Friday Prep',
      black_friday: 'Black Friday',
      cyber_monday: 'Cyber Monday',
      st_nicholas: 'St. Nicholas',
      christmas_eve: 'Christmas Eve',
      new_year_eve: "New Year's Eve"
    },
    roi_calculator: {
      title: 'ROI calculator',
      recap_title: 'Channel recap ({count} active events)',
      events: 'events',
      contacts: 'contacts',
      total_contacts: 'Total contacts',
      total_cost: 'Total cost',
      avg_cost: 'Average cost / contact',
      conversion_rates_title: '% Your conversion rates',
      average_basket_title: 'Average basket (€)',
      estimated_results: 'Estimated results',
      investment_note:
        'For 1€ invested, you can expect {revenuePerEuro}€ in revenue.',
      generated_orders: 'Estimated orders',
      estimated_revenue: 'Estimated revenue',
      investment: 'Investment'
    }
  },
  send_history: {
    page_title: 'Campaign Send History',
    page_lead: 'Track every campaign send — who received messages, when, and whether delivery succeeded.',
    stats: {
      batches: 'Campaign sends',
      total_messages: 'Total messages',
      sent: 'Delivered',
      failed: 'Failed',
      pending: 'Pending'
    },
    filters: {
      source_all: 'All sources',
      source_workflow: 'Workflow',
      source_scheduler: 'Auto Scheduler',
      status_all: 'All statuses',
      status_sent: 'Delivered',
      status_failed: 'Failed',
      status_pending: 'Pending',
      date_from: 'From',
      date_to: 'To',
      clear_dates: 'Clear dates'
    },
    export_csv: 'Export CSV',
    exporting: 'Exporting…',
    export_error: 'Could not export CSV. Try again.',
    auto_refresh_on: 'Auto refresh (10s)',
    auto_refresh_off: 'Auto refresh off',
    last_updated: 'Updated {time}',
    refreshing: 'Refreshing…',
    source_workflow: 'Workflow',
    source_scheduler: 'Auto Scheduler',
    scheduled_at: 'Scheduled',
    completed_at: 'Completed',
    channel: 'Channel',
    template: 'Template',
    recipients: 'Recipients',
    recipient: 'Recipient',
    contact: 'Contact',
    status: 'Status',
    sent_at: 'Sent at',
    error: 'Error',
    attempts: 'Attempts',
    empty: 'No send history yet. Run a workflow campaign or enable Auto Scheduler to see results here.',
    expand: 'Show recipients',
    collapse: 'Hide recipients',
    legacy_batch_note:
      '{count} messages sent — per-recipient detail is only available for sends after this update.',
    status_sent: 'Delivered',
    status_failed: 'Failed',
    status_pending: 'Pending',
    status_processing: 'Processing'
  }
} as const

export function t (
  path: string,
  vars?: Record<string, string | number>
): string {
  const parts = path.split('.')
  let cur: unknown = en
  for (const p of parts) {
    cur = (cur as Record<string, unknown>)?.[p]
  }
  let out = typeof cur === 'string' ? cur : path
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v))
    }
  }
  return out
}
