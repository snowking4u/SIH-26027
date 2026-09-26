--
-- PostgreSQL database dump
--

\restrict o4QPbLsqGmsLAcb8gQcND7ytkKRomRdplT0ruoFQrAt26FNRIx9hiS7aBz0bvox

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: asset_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_master (
    id integer NOT NULL,
    source_system_id integer NOT NULL,
    source_asset_id character varying(100) NOT NULL,
    asset_type character varying(100),
    asset_subtype character varying(100),
    asset_name character varying(150),
    location_id integer,
    installation_date date,
    status character varying(50),
    remarks text
);


--
-- Name: asset_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asset_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asset_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asset_master_id_seq OWNED BY public.asset_master.id;


--
-- Name: asset_parameter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_parameter (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    source_system_id integer NOT NULL,
    parameter_code character varying(100) NOT NULL,
    parameter_name character varying(150),
    parameter_value text,
    unit character varying(50),
    recorded_date timestamp without time zone
);


--
-- Name: asset_parameter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asset_parameter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asset_parameter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asset_parameter_id_seq OWNED BY public.asset_parameter.id;


--
-- Name: available_window; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.available_window (
    id integer NOT NULL,
    station_code character varying(50) NOT NULL,
    line_number character varying(50) NOT NULL,
    window_start timestamp without time zone NOT NULL,
    window_end timestamp without time zone NOT NULL,
    duration_minutes integer NOT NULL,
    window_status character varying(50) NOT NULL,
    calculation_source character varying(200) NOT NULL,
    generated_at timestamp without time zone NOT NULL,
    source_schedule_id integer,
    source_occupancy_id integer,
    remarks text
);


--
-- Name: available_window_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.available_window_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: available_window_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.available_window_id_seq OWNED BY public.available_window.id;


--
-- Name: block_plan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_plan (
    id integer NOT NULL,
    optimization_run_id integer,
    plan_code character varying(100) NOT NULL,
    plan_date date NOT NULL,
    status character varying(50) NOT NULL,
    planning_horizon_start timestamp without time zone NOT NULL,
    planning_horizon_end timestamp without time zone NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    revises_plan_id integer
);


--
-- Name: block_plan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.block_plan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: block_plan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.block_plan_id_seq OWNED BY public.block_plan.id;


--
-- Name: block_plan_task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_plan_task (
    id integer NOT NULL,
    block_plan_id integer NOT NULL,
    planning_task_id integer NOT NULL,
    candidate_block_window_id integer,
    planned_start timestamp without time zone NOT NULL,
    planned_end timestamp without time zone NOT NULL,
    planned_duration_minutes integer NOT NULL,
    sequence_number integer,
    status character varying(50) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_block_plan_task_duration_positive CHECK ((planned_duration_minutes > 0)),
    CONSTRAINT ck_block_plan_task_start_lt_end CHECK ((planned_start < planned_end))
);


--
-- Name: block_plan_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.block_plan_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: block_plan_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.block_plan_task_id_seq OWNED BY public.block_plan_task.id;


--
-- Name: block_requirement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_requirement (
    id integer NOT NULL,
    maintenance_requirement_id integer NOT NULL,
    station_code character varying(50),
    line_number character varying(50),
    block_type character varying(50) NOT NULL,
    required_duration_minutes integer,
    earliest_start timestamp without time zone,
    latest_end timestamp without time zone,
    power_block_required boolean DEFAULT false NOT NULL,
    traffic_block_required boolean DEFAULT false NOT NULL,
    resource_notes text,
    status character varying(50) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: block_requirement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.block_requirement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: block_requirement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.block_requirement_id_seq OWNED BY public.block_requirement.id;


--
-- Name: candidate_block_window; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_block_window (
    id integer NOT NULL,
    planning_task_id integer NOT NULL,
    block_requirement_id integer,
    available_window_id integer NOT NULL,
    candidate_start timestamp without time zone NOT NULL,
    candidate_end timestamp without time zone NOT NULL,
    candidate_duration_minutes integer NOT NULL,
    feasible boolean DEFAULT true NOT NULL,
    feasibility_status character varying(50) NOT NULL,
    feasibility_reason character varying(200),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_candidate_block_window_duration_non_negative CHECK ((candidate_duration_minutes >= 0)),
    CONSTRAINT ck_candidate_block_window_end_gt_start CHECK ((candidate_end > candidate_start))
);


--
-- Name: candidate_block_window_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidate_block_window_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidate_block_window_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidate_block_window_id_seq OWNED BY public.candidate_block_window.id;


--
-- Name: controller_decision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.controller_decision (
    id integer NOT NULL,
    block_plan_id integer NOT NULL,
    decision character varying(50) NOT NULL,
    decided_at timestamp without time zone DEFAULT now() NOT NULL,
    controller_code character varying(100),
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: controller_decision_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.controller_decision_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: controller_decision_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.controller_decision_id_seq OWNED BY public.controller_decision.id;


--
-- Name: defect_failure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.defect_failure (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    source_system_id integer NOT NULL,
    source_record_type character varying(50) NOT NULL,
    source_record_id integer NOT NULL,
    defect_code character varying(100),
    defect_description text,
    severity character varying(50),
    detected_at timestamp without time zone NOT NULL,
    status character varying(50) NOT NULL,
    rectified_at timestamp without time zone,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: defect_failure_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.defect_failure_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: defect_failure_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.defect_failure_id_seq OWNED BY public.defect_failure.id;


--
-- Name: execution_outcome; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.execution_outcome (
    id integer NOT NULL,
    block_plan_id integer NOT NULL,
    block_plan_task_id integer,
    execution_status character varying(50) NOT NULL,
    actual_start timestamp without time zone,
    actual_end timestamp without time zone,
    actual_duration_minutes integer,
    outcome_code character varying(100),
    remarks text,
    recorded_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_execution_outcome_actual_duration_non_negative CHECK (((actual_duration_minutes IS NULL) OR (actual_duration_minutes >= 0))),
    CONSTRAINT ck_execution_outcome_actual_start_lt_end CHECK (((actual_start IS NULL) OR (actual_end IS NULL) OR (actual_start < actual_end)))
);


--
-- Name: execution_outcome_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.execution_outcome_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: execution_outcome_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.execution_outcome_id_seq OWNED BY public.execution_outcome.id;


--
-- Name: line_occupancy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.line_occupancy (
    id integer NOT NULL,
    station_code character varying(50) NOT NULL,
    line_number character varying(50) NOT NULL,
    occupancy_start timestamp without time zone NOT NULL,
    occupancy_end timestamp without time zone,
    occupancy_status character varying(50) NOT NULL,
    train_id integer,
    source_event_id character varying(100),
    remarks text
);


--
-- Name: line_occupancy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.line_occupancy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: line_occupancy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.line_occupancy_id_seq OWNED BY public.line_occupancy.id;


--
-- Name: location_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_master (
    id integer NOT NULL,
    zone_code character varying(50),
    zone_name character varying(100),
    division_code character varying(50),
    division_name character varying(100),
    section_code character varying(50),
    section_name character varying(100),
    station_code character varying(50),
    station_name character varying(100),
    line_code character varying(50),
    line_name character varying(100),
    km_start numeric(10,3),
    km_end numeric(10,3),
    latitude numeric(10,6),
    longitude numeric(10,6)
);


--
-- Name: location_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.location_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: location_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.location_master_id_seq OWNED BY public.location_master.id;


--
-- Name: maintenance_requirement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_requirement (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    source_system_id integer NOT NULL,
    source_record_type character varying(50) NOT NULL,
    source_record_id integer NOT NULL,
    defect_failure_id integer,
    maintenance_type character varying(100) NOT NULL,
    description text,
    required_duration_minutes integer,
    planned_date timestamp without time zone,
    status character varying(50) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: maintenance_requirement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maintenance_requirement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maintenance_requirement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_requirement_id_seq OWNED BY public.maintenance_requirement.id;


--
-- Name: operational_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operational_event (
    id integer NOT NULL,
    train_id integer,
    station_code character varying(50),
    event_type character varying(100) NOT NULL,
    event_datetime timestamp without time zone NOT NULL,
    description text,
    source_event_id character varying(100),
    remarks text
);


--
-- Name: operational_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operational_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operational_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operational_event_id_seq OWNED BY public.operational_event.id;


--
-- Name: optimization_input; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_input (
    id integer NOT NULL,
    optimization_run_id integer NOT NULL,
    planning_task_id integer,
    candidate_block_window_id integer,
    planning_constraint_id integer,
    planning_resource_id integer,
    task_dependency_id integer,
    input_role character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: optimization_input_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.optimization_input_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: optimization_input_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.optimization_input_id_seq OWNED BY public.optimization_input.id;


--
-- Name: optimization_output; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_output (
    id integer NOT NULL,
    optimization_run_id integer NOT NULL,
    planning_task_id integer,
    candidate_block_window_id integer,
    output_type character varying(50) NOT NULL,
    output_status character varying(50) NOT NULL,
    selected boolean DEFAULT false NOT NULL,
    output_payload jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: optimization_output_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.optimization_output_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: optimization_output_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.optimization_output_id_seq OWNED BY public.optimization_output.id;


--
-- Name: optimization_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_run (
    id integer NOT NULL,
    run_code character varying(100) NOT NULL,
    run_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    model_name character varying(150),
    model_version character varying(50),
    input_snapshot_hash character varying(128),
    output_snapshot_hash character varying(128),
    objective_description text,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: optimization_run_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.optimization_run_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: optimization_run_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.optimization_run_id_seq OWNED BY public.optimization_run.id;


--
-- Name: plan_validation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_validation (
    id integer NOT NULL,
    block_plan_id integer NOT NULL,
    validation_type character varying(50) NOT NULL,
    validation_status character varying(50) NOT NULL,
    validation_message text,
    validated_at timestamp without time zone DEFAULT now() NOT NULL,
    validator_version character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_validation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_validation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_validation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_validation_id_seq OWNED BY public.plan_validation.id;


--
-- Name: planning_constraint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planning_constraint (
    id integer NOT NULL,
    planning_task_id integer NOT NULL,
    constraint_type character varying(50) NOT NULL,
    constraint_value character varying(255) NOT NULL,
    hard_constraint boolean DEFAULT true NOT NULL,
    effective_start timestamp without time zone,
    effective_end timestamp without time zone,
    description text,
    source character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: planning_constraint_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planning_constraint_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planning_constraint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planning_constraint_id_seq OWNED BY public.planning_constraint.id;


--
-- Name: planning_priority; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planning_priority (
    id integer NOT NULL,
    planning_task_id integer NOT NULL,
    criticality_level character varying(20) NOT NULL,
    urgency_level character varying(20) NOT NULL,
    safety_impact character varying(20) NOT NULL,
    asset_availability_impact character varying(20) NOT NULL,
    traffic_impact character varying(20) NOT NULL,
    failure_recurrence character varying(20) NOT NULL,
    defect_age_days integer NOT NULL,
    priority_score numeric(5,2) NOT NULL,
    priority_band character varying(20) NOT NULL,
    calculation_version character varying(50) NOT NULL,
    calculated_at timestamp without time zone DEFAULT now() NOT NULL,
    calculation_reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_planning_priority_defect_age_non_negative CHECK ((defect_age_days >= 0)),
    CONSTRAINT ck_planning_priority_score_range CHECK (((priority_score >= (0)::numeric) AND (priority_score <= (100)::numeric)))
);


--
-- Name: planning_priority_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planning_priority_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planning_priority_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planning_priority_id_seq OWNED BY public.planning_priority.id;


--
-- Name: planning_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planning_resource (
    id integer NOT NULL,
    resource_code character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_name character varying(150) NOT NULL,
    description text,
    capacity double precision,
    unit character varying(50),
    status character varying(50) NOT NULL,
    location_code character varying(100),
    source_system_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: planning_resource_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planning_resource_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planning_resource_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planning_resource_id_seq OWNED BY public.planning_resource.id;


--
-- Name: planning_task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planning_task (
    id integer NOT NULL,
    maintenance_requirement_id integer NOT NULL,
    block_requirement_id integer,
    asset_id integer NOT NULL,
    task_code character varying(100) NOT NULL,
    task_type character varying(100) NOT NULL,
    description text,
    status character varying(50) NOT NULL,
    earliest_start timestamp without time zone,
    latest_end timestamp without time zone,
    duration_minutes integer NOT NULL,
    location_code character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: planning_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planning_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planning_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planning_task_id_seq OWNED BY public.planning_task.id;


--
-- Name: smms_alert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smms_alert (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    inspection_id integer,
    alert_type_code character varying(100) NOT NULL,
    alert_feedback_code character varying(100),
    alert_status_code character varying(100) NOT NULL,
    cause_code character varying(100),
    incidence_date_time timestamp without time zone NOT NULL,
    rectification_date_time timestamp without time zone,
    incidence_duration interval,
    alert_feedback_date_time timestamp without time zone,
    remarks text,
    maintainer_name character varying(100),
    maintainer_designation character varying(100),
    maintainer_mobile character varying(50)
);


--
-- Name: smms_alert_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smms_alert_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smms_alert_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smms_alert_id_seq OWNED BY public.smms_alert.id;


--
-- Name: smms_inspection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smms_inspection (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    inspection_date timestamp without time zone NOT NULL,
    inspection_type character varying(100) NOT NULL,
    parameter_code character varying(100) NOT NULL,
    parameter_value text,
    remarks text
);


--
-- Name: smms_inspection_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smms_inspection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smms_inspection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smms_inspection_id_seq OWNED BY public.smms_inspection.id;


--
-- Name: smms_maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smms_maintenance (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    alert_id integer,
    maintenance_type character varying(100) NOT NULL,
    planned_date timestamp without time zone,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    status character varying(50) NOT NULL,
    remarks text
);


--
-- Name: smms_maintenance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smms_maintenance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smms_maintenance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smms_maintenance_id_seq OWNED BY public.smms_maintenance.id;


--
-- Name: source_system; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_system (
    id integer NOT NULL,
    system_code character varying(50) NOT NULL,
    system_name character varying(100) NOT NULL,
    description text
);


--
-- Name: source_system_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.source_system_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: source_system_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.source_system_id_seq OWNED BY public.source_system.id;


--
-- Name: task_dependency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_dependency (
    id integer NOT NULL,
    predecessor_task_id integer NOT NULL,
    successor_task_id integer NOT NULL,
    dependency_type character varying(50) NOT NULL,
    lag_minutes integer DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_task_dependency_lag_minutes_non_negative CHECK ((lag_minutes >= 0)),
    CONSTRAINT ck_task_dependency_predecessor_ne_successor CHECK ((predecessor_task_id <> successor_task_id))
);


--
-- Name: task_dependency_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_dependency_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_dependency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_dependency_id_seq OWNED BY public.task_dependency.id;


--
-- Name: task_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_resource (
    id integer NOT NULL,
    planning_task_id integer NOT NULL,
    planning_resource_id integer NOT NULL,
    required_quantity integer NOT NULL,
    allocation_status character varying(50) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: task_resource_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_resource_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_resource_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_resource_id_seq OWNED BY public.task_resource.id;


--
-- Name: tdms_failure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tdms_failure (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    inspection_id integer,
    failure_code character varying(100) NOT NULL,
    failure_description text,
    severity character varying(50),
    failure_date timestamp without time zone NOT NULL,
    status character varying(50) NOT NULL,
    rectification_date timestamp without time zone,
    remarks text
);


--
-- Name: tdms_failure_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tdms_failure_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tdms_failure_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tdms_failure_id_seq OWNED BY public.tdms_failure.id;


--
-- Name: tdms_inspection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tdms_inspection (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    inspection_date timestamp without time zone NOT NULL,
    inspection_type character varying(100) NOT NULL,
    parameter_code character varying(100) NOT NULL,
    parameter_value text,
    remarks text
);


--
-- Name: tdms_inspection_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tdms_inspection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tdms_inspection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tdms_inspection_id_seq OWNED BY public.tdms_inspection.id;


--
-- Name: tdms_maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tdms_maintenance (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    failure_id integer,
    maintenance_type character varying(100) NOT NULL,
    planned_date timestamp without time zone,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    status character varying(50) NOT NULL,
    remarks text
);


--
-- Name: tdms_maintenance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tdms_maintenance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tdms_maintenance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tdms_maintenance_id_seq OWNED BY public.tdms_maintenance.id;


--
-- Name: tms_defect; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tms_defect (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    inspection_id integer NOT NULL,
    defect_code character varying(100) NOT NULL,
    defect_description text,
    severity character varying(50),
    detected_date timestamp without time zone,
    status character varying(50),
    remarks text
);


--
-- Name: tms_defect_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tms_defect_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tms_defect_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tms_defect_id_seq OWNED BY public.tms_defect.id;


--
-- Name: tms_inspection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tms_inspection (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    inspection_date timestamp without time zone NOT NULL,
    inspection_type character varying(100) NOT NULL,
    parameter_code character varying(100) NOT NULL,
    parameter_value text,
    remarks text
);


--
-- Name: tms_inspection_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tms_inspection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tms_inspection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tms_inspection_id_seq OWNED BY public.tms_inspection.id;


--
-- Name: tms_maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tms_maintenance (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    defect_id integer NOT NULL,
    maintenance_type character varying(100) NOT NULL,
    planned_date timestamp without time zone,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    status character varying(50),
    remarks text
);


--
-- Name: tms_maintenance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tms_maintenance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tms_maintenance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tms_maintenance_id_seq OWNED BY public.tms_maintenance.id;


--
-- Name: train; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.train (
    id integer NOT NULL,
    train_id character varying(100) NOT NULL,
    train_number character varying(50),
    train_name character varying(150),
    schedule_date timestamp without time zone,
    start_date timestamp without time zone,
    loco_number character varying(50),
    direction character varying(50),
    source_system_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: train_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.train_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: train_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.train_id_seq OWNED BY public.train.id;


--
-- Name: train_movement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.train_movement (
    id integer NOT NULL,
    train_id integer NOT NULL,
    station_code character varying(50) NOT NULL,
    movement_flag character varying(1) NOT NULL,
    movement_datetime timestamp without time zone NOT NULL,
    line_number character varying(50),
    source_event_id character varying(100),
    remarks text
);


--
-- Name: train_movement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.train_movement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: train_movement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.train_movement_id_seq OWNED BY public.train_movement.id;


--
-- Name: train_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.train_schedule (
    id integer NOT NULL,
    train_id integer NOT NULL,
    station_code character varying(50) NOT NULL,
    scheduled_arrival timestamp without time zone,
    scheduled_departure timestamp without time zone,
    scheduled_run_through timestamp without time zone,
    sequence_number integer NOT NULL,
    line_number character varying(50),
    source_schedule_id character varying(100),
    remarks text
);


--
-- Name: train_schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.train_schedule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: train_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.train_schedule_id_seq OWNED BY public.train_schedule.id;


--
-- Name: asset_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master ALTER COLUMN id SET DEFAULT nextval('public.asset_master_id_seq'::regclass);


--
-- Name: asset_parameter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_parameter ALTER COLUMN id SET DEFAULT nextval('public.asset_parameter_id_seq'::regclass);


--
-- Name: available_window id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.available_window ALTER COLUMN id SET DEFAULT nextval('public.available_window_id_seq'::regclass);


--
-- Name: block_plan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan ALTER COLUMN id SET DEFAULT nextval('public.block_plan_id_seq'::regclass);


--
-- Name: block_plan_task id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan_task ALTER COLUMN id SET DEFAULT nextval('public.block_plan_task_id_seq'::regclass);


--
-- Name: block_requirement id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_requirement ALTER COLUMN id SET DEFAULT nextval('public.block_requirement_id_seq'::regclass);


--
-- Name: candidate_block_window id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_block_window ALTER COLUMN id SET DEFAULT nextval('public.candidate_block_window_id_seq'::regclass);


--
-- Name: controller_decision id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controller_decision ALTER COLUMN id SET DEFAULT nextval('public.controller_decision_id_seq'::regclass);


--
-- Name: defect_failure id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defect_failure ALTER COLUMN id SET DEFAULT nextval('public.defect_failure_id_seq'::regclass);


--
-- Name: execution_outcome id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_outcome ALTER COLUMN id SET DEFAULT nextval('public.execution_outcome_id_seq'::regclass);


--
-- Name: line_occupancy id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_occupancy ALTER COLUMN id SET DEFAULT nextval('public.line_occupancy_id_seq'::regclass);


--
-- Name: location_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_master ALTER COLUMN id SET DEFAULT nextval('public.location_master_id_seq'::regclass);


--
-- Name: maintenance_requirement id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requirement ALTER COLUMN id SET DEFAULT nextval('public.maintenance_requirement_id_seq'::regclass);


--
-- Name: operational_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_event ALTER COLUMN id SET DEFAULT nextval('public.operational_event_id_seq'::regclass);


--
-- Name: optimization_input id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_input ALTER COLUMN id SET DEFAULT nextval('public.optimization_input_id_seq'::regclass);


--
-- Name: optimization_output id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_output ALTER COLUMN id SET DEFAULT nextval('public.optimization_output_id_seq'::regclass);


--
-- Name: optimization_run id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_run ALTER COLUMN id SET DEFAULT nextval('public.optimization_run_id_seq'::regclass);


--
-- Name: plan_validation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_validation ALTER COLUMN id SET DEFAULT nextval('public.plan_validation_id_seq'::regclass);


--
-- Name: planning_constraint id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_constraint ALTER COLUMN id SET DEFAULT nextval('public.planning_constraint_id_seq'::regclass);


--
-- Name: planning_priority id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_priority ALTER COLUMN id SET DEFAULT nextval('public.planning_priority_id_seq'::regclass);


--
-- Name: planning_resource id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_resource ALTER COLUMN id SET DEFAULT nextval('public.planning_resource_id_seq'::regclass);


--
-- Name: planning_task id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_task ALTER COLUMN id SET DEFAULT nextval('public.planning_task_id_seq'::regclass);


--
-- Name: smms_alert id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_alert ALTER COLUMN id SET DEFAULT nextval('public.smms_alert_id_seq'::regclass);


--
-- Name: smms_inspection id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_inspection ALTER COLUMN id SET DEFAULT nextval('public.smms_inspection_id_seq'::regclass);


--
-- Name: smms_maintenance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_maintenance ALTER COLUMN id SET DEFAULT nextval('public.smms_maintenance_id_seq'::regclass);


--
-- Name: source_system id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_system ALTER COLUMN id SET DEFAULT nextval('public.source_system_id_seq'::regclass);


--
-- Name: task_dependency id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependency ALTER COLUMN id SET DEFAULT nextval('public.task_dependency_id_seq'::regclass);


--
-- Name: task_resource id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_resource ALTER COLUMN id SET DEFAULT nextval('public.task_resource_id_seq'::regclass);


--
-- Name: tdms_failure id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_failure ALTER COLUMN id SET DEFAULT nextval('public.tdms_failure_id_seq'::regclass);


--
-- Name: tdms_inspection id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_inspection ALTER COLUMN id SET DEFAULT nextval('public.tdms_inspection_id_seq'::regclass);


--
-- Name: tdms_maintenance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_maintenance ALTER COLUMN id SET DEFAULT nextval('public.tdms_maintenance_id_seq'::regclass);


--
-- Name: tms_defect id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_defect ALTER COLUMN id SET DEFAULT nextval('public.tms_defect_id_seq'::regclass);


--
-- Name: tms_inspection id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_inspection ALTER COLUMN id SET DEFAULT nextval('public.tms_inspection_id_seq'::regclass);


--
-- Name: tms_maintenance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_maintenance ALTER COLUMN id SET DEFAULT nextval('public.tms_maintenance_id_seq'::regclass);


--
-- Name: train id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train ALTER COLUMN id SET DEFAULT nextval('public.train_id_seq'::regclass);


--
-- Name: train_movement id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train_movement ALTER COLUMN id SET DEFAULT nextval('public.train_movement_id_seq'::regclass);


--
-- Name: train_schedule id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train_schedule ALTER COLUMN id SET DEFAULT nextval('public.train_schedule_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
\.


--
-- Data for Name: asset_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asset_master (id, source_system_id, source_asset_id, asset_type, asset_subtype, asset_name, location_id, installation_date, status, remarks) FROM stdin;
2661	7	TMS-TRK-1342	TRACK_SEGMENT	60KG_RAIL_PSC_SLEEPER	Track Km 1342 UP Main AGC-MTJ	433	2020-03-15	OPERATIONAL	Standard 60kg rail on pre-stressed concrete sleepers
2662	7	TMS-TRK-1347	TRACK_SEGMENT	60KG_RAIL_PSC_SLEEPER	Track Km 1347 UP Main RKM Section	434	2019-11-20	OPERATIONAL	Continuous welded rail section
2663	8	TDMS-OHE-84	OHE_CANTILEVER	25KV_SINGLE_CANTILEVER	OHE Cantilever Mast 1343/18 AGC-MTJ	433	2018-07-10	OPERATIONAL	Polygonal catenary 65 sq mm cadmium copper catenary
2664	8	TDMS-OHE-92	OHE_CANTILEVER	25KV_DOUBLE_CANTILEVER	OHE Cantilever Mast 1391/04 MTJ Yard	435	2021-01-05	OPERATIONAL	Yard span multi-track cantilever
2665	9	SMMS-PT-101A	POINT_MACHINE	IRS_ROTARY_POINT_143MM	Dual Control Point Machine 101A AGC Yard	433	2022-04-12	OPERATIONAL	143mm stroke point machine with internal locking
2666	9	SMMS-SIG-S12	SIGNAL_POST	4_ASPECT_COLOUR_LIGHT_LED	Home Signal S12 UP Main RKM	434	2021-09-18	OPERATIONAL	4-aspect automatic block signaling post
2667	7	TMS-TRK-1332	TRACK_SEGMENT	\N	Bhandai Goods Loop Track Siding	439	2017-04-10	OPERATIONAL	\N
2668	7	AGC-TRK-UP01	TRACK	\N	Agra Cantt UP Main Track Section Km 1342	433	\N	OPERATIONAL	Operational infrastructure asset at AGC UP-MAIN
2669	7	AGC-TRK-DN01	TRACK	\N	Agra Cantt DOWN Main Track Section Km 1343	436	\N	OPERATIONAL	Operational infrastructure asset at AGC DOWN-MAIN
2670	9	AGC-PT-101A	POINT_MACHINE	\N	Turnout 101A Point Machine North Yard	433	\N	OPERATIONAL	Operational infrastructure asset at AGC UP-MAIN
2671	9	AGC-PT-102B	POINT_MACHINE	\N	Turnout 102B Dual Control Point Machine	436	\N	OPERATIONAL	Operational infrastructure asset at AGC DOWN-MAIN
2672	9	AGC-SIG-S01	SIGNAL	\N	UP Main Home Signal S1	433	\N	OPERATIONAL	Operational infrastructure asset at AGC UP-MAIN
2673	7	RKM-TRK-UP01	TRACK	\N	Raja Ki Mandi UP Track Section Km 1347	434	\N	OPERATIONAL	Operational infrastructure asset at RKM UP-MAIN
2674	9	RKM-SIG-S12	SIGNAL	\N	Raja Ki Mandi UP Home Signal S12	434	\N	OPERATIONAL	Operational infrastructure asset at RKM UP-MAIN
2675	7	MTJ-TRK-DN01	TRACK	\N	Mathura Junction DOWN Track Section Km 1398	438	\N	OPERATIONAL	Operational infrastructure asset at MTJ DOWN-MAIN
2676	9	MTJ-PT-205A	POINT_MACHINE	\N	Mathura Junction Switch 205A Machine	438	\N	OPERATIONAL	Operational infrastructure asset at MTJ DOWN-MAIN
2677	8	MTJ-OHE-DN92	OCS	\N	Mathura Junction 25kV OHE Section Insulator 92	438	\N	OPERATIONAL	Operational infrastructure asset at MTJ DOWN-MAIN
2678	7	BHA-TRK-3RD01	TRACK	\N	Bhandai Goods Loop Track Section Km 1335	439	\N	OPERATIONAL	Operational infrastructure asset at BHA 3RD-LINE
\.


--
-- Data for Name: asset_parameter; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asset_parameter (id, asset_id, source_system_id, parameter_code, parameter_name, parameter_value, unit, recorded_date) FROM stdin;
934	2661	7	GAUGE_DEV_MM	Track Gauge Deviation	+3.2	mm	2026-09-25 13:30:00
935	2663	8	CONTACT_WIRE_HEIGHT_MM	Contact Wire Height	5550	mm	2026-09-25 14:30:00
936	2661	7	RAIL_SECTION	Rail Section	60_KG_90_UTS	SECTION	\N
937	2663	8	VOLTAGE_RATING	Voltage Rating	25	KV	\N
938	2665	9	THROW_STROKE_MM	Throw Stroke	143.0	MM	\N
\.


--
-- Data for Name: available_window; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.available_window (id, station_code, line_number, window_start, window_end, duration_minutes, window_status, calculation_source, generated_at, source_schedule_id, source_occupancy_id, remarks) FROM stdin;
2053	AGC	UP-MAIN	2026-09-25 14:00:00	2026-09-26 10:55:00	1255	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.995623	\N	3078	Derived gap: effective occupied interval ending 2026-09-25 14:00:00 (source_occupancy_id=3078, source_schedule_id=None) and next recorded conflict starting 2026-09-26 10:55:00 (source_occupancy_id=3080, source_schedule_id=None).
2054	AGC	UP-MAIN	2026-09-26 12:00:00	2026-09-26 14:00:00	120	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.99581	\N	3080	Derived gap: effective occupied interval ending 2026-09-26 12:00:00 (source_occupancy_id=3080, source_schedule_id=None) and next recorded conflict starting 2026-09-26 14:00:00 (source_occupancy_id=3081, source_schedule_id=None).
2055	RKM	UP-MAIN	2026-09-26 11:15:00	2026-09-26 13:30:00	135	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.995864	\N	3084	Derived gap: effective occupied interval ending 2026-09-26 11:15:00 (source_occupancy_id=3084, source_schedule_id=None) and next recorded conflict starting 2026-09-26 13:30:00 (source_occupancy_id=3085, source_schedule_id=None).
2056	MTJ	UP-MAIN	2026-09-26 11:45:00	2026-09-26 14:15:00	150	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.995907	\N	3088	Derived gap: effective occupied interval ending 2026-09-26 11:45:00 (source_occupancy_id=3088, source_schedule_id=None) and next recorded conflict starting 2026-09-26 14:15:00 (source_occupancy_id=3089, source_schedule_id=None).
2057	FAR	UP-MAIN	2026-09-26 11:25:00	2026-09-26 13:45:00	140	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.995944	\N	3092	Derived gap: effective occupied interval ending 2026-09-26 11:25:00 (source_occupancy_id=3092, source_schedule_id=None) and next recorded conflict starting 2026-09-26 13:45:00 (source_occupancy_id=3093, source_schedule_id=None).
2058	BHA	DOWN-MAIN	2026-09-26 11:10:00	2026-09-26 13:40:00	150	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.995981	\N	3098	Derived gap: effective occupied interval ending 2026-09-26 11:10:00 (source_occupancy_id=3098, source_schedule_id=None) and next recorded conflict starting 2026-09-26 13:40:00 (source_occupancy_id=3099, source_schedule_id=None).
2059	BHA	3RD-LINE	2026-09-26 12:00:00	2026-09-26 15:00:00	180	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.996014	\N	3100	Derived gap: effective occupied interval ending 2026-09-26 12:00:00 (source_occupancy_id=3100, source_schedule_id=None) and next recorded conflict starting 2026-09-26 15:00:00 (source_occupancy_id=3101, source_schedule_id=None).
2060	AGC	DOWN-MAIN	2026-09-26 11:45:00	2026-09-26 13:45:00	120	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.99605	\N	3082	Derived gap: effective occupied interval ending 2026-09-26 11:45:00 (source_occupancy_id=3082, source_schedule_id=None) and next recorded conflict starting 2026-09-26 13:45:00 (source_occupancy_id=3083, source_schedule_id=None).
2061	FAR	DOWN-MAIN	2026-09-26 11:15:00	2026-09-26 13:10:00	115	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.996085	\N	3094	Derived gap: effective occupied interval ending 2026-09-26 11:15:00 (source_occupancy_id=3094, source_schedule_id=None) and next recorded conflict starting 2026-09-26 13:10:00 (source_occupancy_id=3095, source_schedule_id=None).
2062	BHA	UP-MAIN	2026-09-26 10:20:00	2026-09-26 13:00:00	160	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.99612	\N	3096	Derived gap: effective occupied interval ending 2026-09-26 10:20:00 (source_occupancy_id=3096, source_schedule_id=None) and next recorded conflict starting 2026-09-26 13:00:00 (source_occupancy_id=3097, source_schedule_id=None).
2063	RKM	DOWN-MAIN	2026-09-26 10:45:00	2026-09-26 12:45:00	120	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.996154	\N	3086	Derived gap: effective occupied interval ending 2026-09-26 10:45:00 (source_occupancy_id=3086, source_schedule_id=None) and next recorded conflict starting 2026-09-26 12:45:00 (source_occupancy_id=3087, source_schedule_id=None).
2064	MTJ	DOWN-MAIN	2026-09-26 11:05:00	2026-09-26 13:00:00	115	AVAILABLE	DETERMINISTIC:COA_SOURCE_DERIVATION_GAP	2026-09-26 09:53:52.99619	\N	3090	Derived gap: effective occupied interval ending 2026-09-26 11:05:00 (source_occupancy_id=3090, source_schedule_id=None) and next recorded conflict starting 2026-09-26 13:00:00 (source_occupancy_id=3091, source_schedule_id=None).
\.


--
-- Data for Name: block_plan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.block_plan (id, optimization_run_id, plan_code, plan_date, status, planning_horizon_start, planning_horizon_end, description, created_at, updated_at, revises_plan_id) FROM stdin;
92	14	BP-AGC-CORRIDOR-20260926095558	2026-09-26	PROPOSED	2026-09-26 13:30:00	2026-09-27 01:30:00	Agra Cantt Main Lines Daytime Maintenance Block Plan	2026-09-26 15:25:35.883267	2026-09-26 15:25:35.883267	\N
93	14	BP-RKM-CORRIDOR-20260926095558	2026-09-26	PROPOSED	2026-09-26 13:30:00	2026-09-27 01:30:00	Raja Ki Mandi UP Main Lines Maintenance Block Plan (Competing tasks resolved)	2026-09-26 15:25:36.046891	2026-09-26 15:25:36.046891	\N
94	14	BP-MTJ-CORRIDOR-20260926095559	2026-09-26	PROPOSED	2026-09-26 13:30:00	2026-09-27 01:30:00	Mathura Junction DOWN Main Deep Screening Block Plan	2026-09-26 15:25:36.197604	2026-09-26 15:25:36.197604	\N
\.


--
-- Data for Name: block_plan_task; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.block_plan_task (id, block_plan_id, planning_task_id, candidate_block_window_id, planned_start, planned_end, planned_duration_minutes, sequence_number, status, remarks, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: block_requirement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.block_requirement (id, maintenance_requirement_id, station_code, line_number, block_type, required_duration_minutes, earliest_start, latest_end, power_block_required, traffic_block_required, resource_notes, status, remarks, created_at) FROM stdin;
26711	28121	AGC	UP-MAIN	TRAFFIC	90	2026-09-26 12:00:00	2026-09-26 14:00:00	f	t	Rail cut & weld gang WELD-GANG-02 with ultrasonic flaw detector	PENDING	Traffic block for rail cut and replace on UP-MAIN	2026-09-26 15:23:53.055664
26712	28122	RKM	UP-MAIN	TRAFFIC	120	2026-09-26 11:15:00	2026-09-26 13:30:00	f	t	BCM-NCR-04 and tamping machine CSM-NCR-10	PENDING	Ballast deep screening block on RKM section	2026-09-26 15:23:53.126151
26713	28125	AGC	UP-MAIN	POWER	75	2026-09-26 12:00:00	2026-09-26 14:00:00	t	f	Tower Wagon TW-AGC-01 with 25kV OHE isolation permit	PENDING	Power block isolation for cantilever bracket insulator	2026-09-26 15:23:53.191287
26714	28126	MTJ	UP-MAIN	POWER	90	2026-09-26 11:45:00	2026-09-26 14:15:00	t	f	Tower wagon and ladder trolley inspection gang	PENDING	Power block for contact wire stagger adjustment	2026-09-26 15:23:53.258756
26715	28129	AGC	DOWN-MAIN	INTEGRATED	90	2026-09-26 11:45:00	2026-09-26 13:45:00	f	t	Signalling ESM gang with point machine tester	PENDING	Integrated block for dual control point machine overhaul	2026-09-26 15:23:53.324066
26716	28130	RKM	UP-MAIN	INTEGRATED	60	2026-09-26 11:15:00	2026-09-26 13:30:00	f	t	Signal maintainer team with multimeters & insulation testers	PENDING	Signalling block for Home Signal S12 cable testing	2026-09-26 15:23:53.39315
26717	28133	AGC	UP-MAIN	INTEGRATED	75	2026-09-26 15:30:00	2026-09-26 21:30:00	f	f	A/T Welding Gang with rail cutting kit	PENDING	Multi-window task: Fits in W1 (primary) or W2 (alternative)	2026-09-26 15:25:33.409826
26718	28137	AGC	UP-MAIN	INTEGRATED	120	2026-09-26 16:30:00	2026-09-26 21:00:00	f	f	Signalling ESM gang with point machine tester	PENDING	Competes with AGC-TRK-UP01 for W2 (180m)	2026-09-26 15:25:33.497378
26719	28138	AGC	DOWN-MAIN	INTEGRATED	120	2026-09-26 16:30:00	2026-09-26 21:00:00	f	f	ESM team with friction clutch tester	PENDING	Fits AGC DOWN W2 (150m)	2026-09-26 15:25:33.597532
26720	28134	RKM	UP-MAIN	INTEGRATED	100	2026-09-26 15:30:00	2026-09-26 22:00:00	f	f	Track tamping gang with CSM tamper	PENDING	Fits RKM-UP W1 (120m) or W2 (165m); alternative available	2026-09-26 15:25:33.703141
26721	28139	RKM	UP-MAIN	INTEGRATED	110	2026-09-26 15:30:00	2026-09-26 22:00:00	f	f	Signal cable renewal gang with megger & cable locator	PENDING	Competes with RKM-TRK-UP01 for RKM-UP windows	2026-09-26 15:25:33.811261
26722	28135	MTJ	DOWN-MAIN	INTEGRATED	120	2026-09-26 16:30:00	2026-09-26 21:30:00	f	f	BCM deep screening machine & hopper train	PENDING	Fits MTJ-DN W2 (150m); W1 (75m) is too short	2026-09-26 15:25:33.904832
26723	28136	MTJ	DOWN-MAIN	INTEGRATED	90	2026-09-26 13:30:00	2026-09-26 18:00:00	f	f	OHE Tower wagon TRD gang	PENDING	Deadline 12:30: W1 is too short (75m), W2 starts after deadline (12:45)	2026-09-26 15:25:34.007664
\.


--
-- Data for Name: candidate_block_window; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidate_block_window (id, planning_task_id, block_requirement_id, available_window_id, candidate_start, candidate_end, candidate_duration_minutes, feasible, feasibility_status, feasibility_reason, created_at, updated_at) FROM stdin;
254393	27273	26711	2053	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254394	27273	26711	2054	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	REQUIRES_REVIEW	TRAFFIC_BLOCK_CONFIRMATION_REQUIRED	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254395	27273	26711	2055	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254396	27273	26711	2056	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254397	27273	26711	2057	2026-09-26 11:25:00	2026-09-26 12:55:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254398	27273	26711	2058	2026-09-26 11:10:00	2026-09-26 12:40:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254399	27273	26711	2059	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254400	27273	26711	2060	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254401	27273	26711	2061	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254402	27273	26711	2062	2026-09-26 10:20:00	2026-09-26 11:50:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254403	27273	26711	2063	2026-09-26 10:45:00	2026-09-26 12:15:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254404	27273	26711	2064	2026-09-26 11:05:00	2026-09-26 12:35:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254405	27274	26712	2053	2026-09-25 14:00:00	2026-09-25 16:00:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254406	27274	26712	2054	2026-09-26 12:00:00	2026-09-26 14:00:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254407	27274	26712	2055	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	REQUIRES_REVIEW	TRAFFIC_BLOCK_CONFIRMATION_REQUIRED	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254408	27274	26712	2056	2026-09-26 11:45:00	2026-09-26 13:45:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254409	27274	26712	2057	2026-09-26 11:25:00	2026-09-26 13:25:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254410	27274	26712	2058	2026-09-26 11:10:00	2026-09-26 13:10:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254411	27274	26712	2059	2026-09-26 12:00:00	2026-09-26 14:00:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254412	27274	26712	2060	2026-09-26 11:45:00	2026-09-26 13:45:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254413	27274	26712	2061	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254414	27274	26712	2062	2026-09-26 10:20:00	2026-09-26 12:20:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254415	27274	26712	2063	2026-09-26 10:45:00	2026-09-26 12:45:00	120	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254416	27274	26712	2064	2026-09-26 11:05:00	2026-09-26 13:05:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254417	27275	\N	2053	2026-09-25 14:00:00	2026-09-25 15:30:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254418	27275	\N	2054	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254419	27275	\N	2055	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254420	27275	\N	2056	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254421	27275	\N	2057	2026-09-26 11:25:00	2026-09-26 12:55:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254422	27275	\N	2058	2026-09-26 11:10:00	2026-09-26 12:40:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254423	27275	\N	2059	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254424	27275	\N	2060	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254425	27275	\N	2061	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254426	27275	\N	2062	2026-09-26 10:20:00	2026-09-26 11:50:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254427	27275	\N	2063	2026-09-26 10:45:00	2026-09-26 12:15:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254428	27275	\N	2064	2026-09-26 11:05:00	2026-09-26 12:35:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254429	27276	\N	2053	2026-09-25 14:00:00	2026-09-25 16:00:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254430	27276	\N	2054	2026-09-26 12:00:00	2026-09-26 14:00:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254431	27276	\N	2055	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254432	27276	\N	2056	2026-09-26 11:45:00	2026-09-26 13:45:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254433	27276	\N	2057	2026-09-26 11:25:00	2026-09-26 13:25:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254434	27276	\N	2058	2026-09-26 11:10:00	2026-09-26 13:10:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254435	27276	\N	2059	2026-09-26 12:00:00	2026-09-26 14:00:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254436	27276	\N	2060	2026-09-26 11:45:00	2026-09-26 13:45:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254437	27276	\N	2061	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254438	27276	\N	2062	2026-09-26 10:20:00	2026-09-26 12:20:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254439	27276	\N	2063	2026-09-26 10:45:00	2026-09-26 12:45:00	120	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254440	27276	\N	2064	2026-09-26 11:05:00	2026-09-26 13:05:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254441	27277	26713	2053	2026-09-26 12:00:00	2026-09-26 13:15:00	75	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254442	27277	26713	2054	2026-09-26 12:00:00	2026-09-26 13:15:00	75	f	REQUIRES_REVIEW	POWER_BLOCK_CONFIRMATION_REQUIRED	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254443	27277	26713	2055	2026-09-26 11:15:00	2026-09-26 12:30:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254444	27277	26713	2056	2026-09-26 11:45:00	2026-09-26 13:00:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254445	27277	26713	2057	2026-09-26 11:25:00	2026-09-26 12:40:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254446	27277	26713	2058	2026-09-26 11:10:00	2026-09-26 12:25:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254447	27277	26713	2059	2026-09-26 12:00:00	2026-09-26 13:15:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254448	27277	26713	2060	2026-09-26 11:45:00	2026-09-26 13:00:00	75	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254449	27277	26713	2061	2026-09-26 11:15:00	2026-09-26 12:30:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254450	27277	26713	2062	2026-09-26 10:20:00	2026-09-26 11:35:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254451	27277	26713	2063	2026-09-26 10:45:00	2026-09-26 12:00:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254452	27277	26713	2064	2026-09-26 11:05:00	2026-09-26 12:20:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254453	27278	26714	2053	2026-09-25 14:00:00	2026-09-25 15:30:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254454	27278	26714	2054	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254455	27278	26714	2055	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254456	27278	26714	2056	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	REQUIRES_REVIEW	POWER_BLOCK_CONFIRMATION_REQUIRED	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254457	27278	26714	2057	2026-09-26 11:25:00	2026-09-26 12:55:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254458	27278	26714	2058	2026-09-26 11:10:00	2026-09-26 12:40:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254459	27278	26714	2059	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254460	27278	26714	2060	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254461	27278	26714	2061	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254462	27278	26714	2062	2026-09-26 10:20:00	2026-09-26 11:50:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254463	27278	26714	2063	2026-09-26 10:45:00	2026-09-26 12:15:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254464	27278	26714	2064	2026-09-26 11:05:00	2026-09-26 12:35:00	90	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254465	27279	\N	2053	2026-09-25 14:00:00	2026-09-25 15:15:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254466	27279	\N	2054	2026-09-26 12:00:00	2026-09-26 13:15:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254467	27279	\N	2055	2026-09-26 11:15:00	2026-09-26 12:30:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254468	27279	\N	2056	2026-09-26 11:45:00	2026-09-26 13:00:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254469	27279	\N	2057	2026-09-26 11:25:00	2026-09-26 12:40:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254470	27279	\N	2058	2026-09-26 11:10:00	2026-09-26 12:25:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254471	27279	\N	2059	2026-09-26 12:00:00	2026-09-26 13:15:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254472	27279	\N	2060	2026-09-26 11:45:00	2026-09-26 13:00:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254473	27279	\N	2061	2026-09-26 11:15:00	2026-09-26 12:30:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254474	27279	\N	2062	2026-09-26 10:20:00	2026-09-26 11:35:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254475	27279	\N	2063	2026-09-26 10:45:00	2026-09-26 12:00:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254476	27279	\N	2064	2026-09-26 11:05:00	2026-09-26 12:20:00	75	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254477	27280	\N	2053	2026-09-25 14:00:00	2026-09-25 15:30:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254478	27280	\N	2054	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254479	27280	\N	2055	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254480	27280	\N	2056	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254481	27280	\N	2057	2026-09-26 11:25:00	2026-09-26 12:55:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254482	27280	\N	2058	2026-09-26 11:10:00	2026-09-26 12:40:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254483	27280	\N	2059	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254484	27280	\N	2060	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254485	27280	\N	2061	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254486	27280	\N	2062	2026-09-26 10:20:00	2026-09-26 11:50:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254487	27280	\N	2063	2026-09-26 10:45:00	2026-09-26 12:15:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254488	27280	\N	2064	2026-09-26 11:05:00	2026-09-26 12:35:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254489	27281	26715	2053	2026-09-25 14:00:00	2026-09-25 15:30:00	90	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254490	27281	26715	2054	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254491	27281	26715	2055	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254492	27281	26715	2056	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254493	27281	26715	2057	2026-09-26 11:25:00	2026-09-26 12:55:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254494	27281	26715	2058	2026-09-26 11:10:00	2026-09-26 12:40:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254495	27281	26715	2059	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254496	27281	26715	2060	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	REQUIRES_REVIEW	TRAFFIC_BLOCK_CONFIRMATION_REQUIRED	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254497	27281	26715	2061	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254498	27281	26715	2062	2026-09-26 10:20:00	2026-09-26 11:50:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254499	27281	26715	2063	2026-09-26 10:45:00	2026-09-26 12:15:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254500	27281	26715	2064	2026-09-26 11:05:00	2026-09-26 12:35:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254501	27282	26716	2053	2026-09-25 14:00:00	2026-09-25 15:00:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254502	27282	26716	2054	2026-09-26 12:00:00	2026-09-26 13:00:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254503	27282	26716	2055	2026-09-26 11:15:00	2026-09-26 12:15:00	60	f	REQUIRES_REVIEW	TRAFFIC_BLOCK_CONFIRMATION_REQUIRED	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254504	27282	26716	2056	2026-09-26 11:45:00	2026-09-26 12:45:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254505	27282	26716	2057	2026-09-26 11:25:00	2026-09-26 12:25:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254506	27282	26716	2058	2026-09-26 11:10:00	2026-09-26 12:10:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254507	27282	26716	2059	2026-09-26 12:00:00	2026-09-26 13:00:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254508	27282	26716	2060	2026-09-26 11:45:00	2026-09-26 12:45:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254509	27282	26716	2061	2026-09-26 11:15:00	2026-09-26 12:15:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254510	27282	26716	2062	2026-09-26 10:20:00	2026-09-26 11:20:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254511	27282	26716	2063	2026-09-26 10:45:00	2026-09-26 11:45:00	60	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254512	27282	26716	2064	2026-09-26 11:05:00	2026-09-26 12:05:00	60	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254513	27283	\N	2053	2026-09-25 14:00:00	2026-09-25 15:30:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254514	27283	\N	2054	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254515	27283	\N	2055	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254516	27283	\N	2056	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254517	27283	\N	2057	2026-09-26 11:25:00	2026-09-26 12:55:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254518	27283	\N	2058	2026-09-26 11:10:00	2026-09-26 12:40:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254519	27283	\N	2059	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254520	27283	\N	2060	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254521	27283	\N	2061	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254522	27283	\N	2062	2026-09-26 10:20:00	2026-09-26 11:50:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254523	27283	\N	2063	2026-09-26 10:45:00	2026-09-26 12:15:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254524	27283	\N	2064	2026-09-26 11:05:00	2026-09-26 12:35:00	90	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254525	27284	\N	2053	2026-09-25 14:00:00	2026-09-25 15:00:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254526	27284	\N	2054	2026-09-26 12:00:00	2026-09-26 13:00:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254527	27284	\N	2055	2026-09-26 11:15:00	2026-09-26 12:15:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254528	27284	\N	2056	2026-09-26 11:45:00	2026-09-26 12:45:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254529	27284	\N	2057	2026-09-26 11:25:00	2026-09-26 12:25:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254530	27284	\N	2058	2026-09-26 11:10:00	2026-09-26 12:10:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254531	27284	\N	2059	2026-09-26 12:00:00	2026-09-26 13:00:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254532	27284	\N	2060	2026-09-26 11:45:00	2026-09-26 12:45:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254533	27284	\N	2061	2026-09-26 11:15:00	2026-09-26 12:15:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254534	27284	\N	2062	2026-09-26 10:20:00	2026-09-26 11:20:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254535	27284	\N	2063	2026-09-26 10:45:00	2026-09-26 11:45:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254536	27284	\N	2064	2026-09-26 11:05:00	2026-09-26 12:05:00	60	f	REQUIRES_REVIEW	MISSING_LOCATION_CONTEXT	2026-09-26 15:23:53.656452	2026-09-26 15:23:53.656452
254537	27285	26717	2053	2026-09-26 15:30:00	2026-09-26 16:45:00	75	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254538	27285	26717	2054	2026-09-26 15:30:00	2026-09-26 16:45:00	75	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254539	27285	26717	2055	2026-09-26 11:15:00	2026-09-26 12:30:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254540	27285	26717	2056	2026-09-26 11:45:00	2026-09-26 13:00:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254541	27285	26717	2057	2026-09-26 11:25:00	2026-09-26 12:40:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254542	27285	26717	2058	2026-09-26 11:10:00	2026-09-26 12:25:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254543	27285	26717	2059	2026-09-26 12:00:00	2026-09-26 13:15:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254544	27285	26717	2060	2026-09-26 11:45:00	2026-09-26 13:00:00	75	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254545	27285	26717	2061	2026-09-26 11:15:00	2026-09-26 12:30:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254546	27285	26717	2062	2026-09-26 10:20:00	2026-09-26 11:35:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254547	27285	26717	2063	2026-09-26 10:45:00	2026-09-26 12:00:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254548	27285	26717	2064	2026-09-26 11:05:00	2026-09-26 12:20:00	75	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254549	27286	26720	2053	2026-09-25 14:00:00	2026-09-25 15:40:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254550	27286	26720	2054	2026-09-26 12:00:00	2026-09-26 13:40:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254551	27286	26720	2055	2026-09-26 15:30:00	2026-09-26 17:10:00	100	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254552	27286	26720	2056	2026-09-26 11:45:00	2026-09-26 13:25:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254553	27286	26720	2057	2026-09-26 11:25:00	2026-09-26 13:05:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254554	27286	26720	2058	2026-09-26 11:10:00	2026-09-26 12:50:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254555	27286	26720	2059	2026-09-26 12:00:00	2026-09-26 13:40:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254556	27286	26720	2060	2026-09-26 11:45:00	2026-09-26 13:25:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254557	27286	26720	2061	2026-09-26 11:15:00	2026-09-26 12:55:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254558	27286	26720	2062	2026-09-26 10:20:00	2026-09-26 12:00:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254559	27286	26720	2063	2026-09-26 10:45:00	2026-09-26 12:25:00	100	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254560	27286	26720	2064	2026-09-26 11:05:00	2026-09-26 12:45:00	100	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254561	27287	26722	2053	2026-09-25 14:00:00	2026-09-25 16:00:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254562	27287	26722	2054	2026-09-26 12:00:00	2026-09-26 14:00:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254563	27287	26722	2055	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254564	27287	26722	2056	2026-09-26 11:45:00	2026-09-26 13:45:00	120	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254565	27287	26722	2057	2026-09-26 11:25:00	2026-09-26 13:25:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254566	27287	26722	2058	2026-09-26 11:10:00	2026-09-26 13:10:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254567	27287	26722	2059	2026-09-26 12:00:00	2026-09-26 14:00:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254568	27287	26722	2060	2026-09-26 11:45:00	2026-09-26 13:45:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254569	27287	26722	2061	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254570	27287	26722	2062	2026-09-26 10:20:00	2026-09-26 12:20:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254571	27287	26722	2063	2026-09-26 10:45:00	2026-09-26 12:45:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254572	27287	26722	2064	2026-09-26 11:05:00	2026-09-26 13:05:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254573	27288	26723	2053	2026-09-25 14:00:00	2026-09-25 15:30:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254574	27288	26723	2054	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254575	27288	26723	2055	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254576	27288	26723	2056	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254577	27288	26723	2057	2026-09-26 11:25:00	2026-09-26 12:55:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254578	27288	26723	2058	2026-09-26 11:10:00	2026-09-26 12:40:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254579	27288	26723	2059	2026-09-26 12:00:00	2026-09-26 13:30:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254580	27288	26723	2060	2026-09-26 11:45:00	2026-09-26 13:15:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254581	27288	26723	2061	2026-09-26 11:15:00	2026-09-26 12:45:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254582	27288	26723	2062	2026-09-26 10:20:00	2026-09-26 11:50:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254583	27288	26723	2063	2026-09-26 10:45:00	2026-09-26 12:15:00	90	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254584	27288	26723	2064	2026-09-26 13:30:00	2026-09-26 15:00:00	90	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254585	27289	26718	2053	2026-09-26 16:30:00	2026-09-26 18:30:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254586	27289	26718	2054	2026-09-26 16:30:00	2026-09-26 18:30:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254587	27289	26718	2055	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254588	27289	26718	2056	2026-09-26 11:45:00	2026-09-26 13:45:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254589	27289	26718	2057	2026-09-26 11:25:00	2026-09-26 13:25:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254590	27289	26718	2058	2026-09-26 11:10:00	2026-09-26 13:10:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254591	27289	26718	2059	2026-09-26 12:00:00	2026-09-26 14:00:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254592	27289	26718	2060	2026-09-26 11:45:00	2026-09-26 13:45:00	120	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254593	27289	26718	2061	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254594	27289	26718	2062	2026-09-26 10:20:00	2026-09-26 12:20:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254595	27289	26718	2063	2026-09-26 10:45:00	2026-09-26 12:45:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254596	27289	26718	2064	2026-09-26 11:05:00	2026-09-26 13:05:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254597	27290	26719	2053	2026-09-25 14:00:00	2026-09-25 16:00:00	120	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254598	27290	26719	2054	2026-09-26 12:00:00	2026-09-26 14:00:00	120	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254599	27290	26719	2055	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254600	27290	26719	2056	2026-09-26 11:45:00	2026-09-26 13:45:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254601	27290	26719	2057	2026-09-26 11:25:00	2026-09-26 13:25:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254602	27290	26719	2058	2026-09-26 11:10:00	2026-09-26 13:10:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254603	27290	26719	2059	2026-09-26 12:00:00	2026-09-26 14:00:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254604	27290	26719	2060	2026-09-26 16:30:00	2026-09-26 18:30:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254605	27290	26719	2061	2026-09-26 11:15:00	2026-09-26 13:15:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254606	27290	26719	2062	2026-09-26 10:20:00	2026-09-26 12:20:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254607	27290	26719	2063	2026-09-26 10:45:00	2026-09-26 12:45:00	120	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254608	27290	26719	2064	2026-09-26 11:05:00	2026-09-26 13:05:00	120	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254609	27291	26721	2053	2026-09-25 14:00:00	2026-09-25 15:50:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254610	27291	26721	2054	2026-09-26 12:00:00	2026-09-26 13:50:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254611	27291	26721	2055	2026-09-26 15:30:00	2026-09-26 17:20:00	110	f	INFEASIBLE	DURATION_EXCEEDS_WINDOW	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254612	27291	26721	2056	2026-09-26 11:45:00	2026-09-26 13:35:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254613	27291	26721	2057	2026-09-26 11:25:00	2026-09-26 13:15:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254614	27291	26721	2058	2026-09-26 11:10:00	2026-09-26 13:00:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254615	27291	26721	2059	2026-09-26 12:00:00	2026-09-26 13:50:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254616	27291	26721	2060	2026-09-26 11:45:00	2026-09-26 13:35:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254617	27291	26721	2061	2026-09-26 11:15:00	2026-09-26 13:05:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254618	27291	26721	2062	2026-09-26 10:20:00	2026-09-26 12:10:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254619	27291	26721	2063	2026-09-26 10:45:00	2026-09-26 12:35:00	110	f	INFEASIBLE	LINE_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
254620	27291	26721	2064	2026-09-26 11:05:00	2026-09-26 12:55:00	110	f	INFEASIBLE	LOCATION_MISMATCH	2026-09-26 15:25:35.40002	2026-09-26 15:25:35.40002
\.


--
-- Data for Name: controller_decision; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.controller_decision (id, block_plan_id, decision, decided_at, controller_code, remarks, created_at) FROM stdin;
11	92	APPROVED	2026-09-26 15:25:36.392364	\N	Approved. Track and Point blocks fit within non-conflicting passenger gaps.	2026-09-26 15:25:36.392364
\.


--
-- Data for Name: defect_failure; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.defect_failure (id, asset_id, source_system_id, source_record_type, source_record_id, defect_code, defect_description, severity, detected_at, status, rectified_at, remarks, created_at) FROM stdin;
27990	2661	7	TMS_DEFECT	9332	IMMINENT_WELD_FAILURE	IMR ultrasonic flaw detected on RH rail head Km 1342/14	CRITICAL	2026-09-25 14:00:00	OPEN	\N	\N	2026-09-26 15:23:49.342071
27991	2662	7	TMS_DEFECT	9333	BALLAST_CUSHION_DEFICIT	Caked and fouled ballast cushion depth below 150mm near Km 1347/08	MAJOR	2026-09-25 14:45:00	OPEN	\N	\N	2026-09-26 15:23:49.342071
27992	2661	7	TMS_DEFECT	9334	IMMINENT_WELD_FAILURE	\N	CRITICAL	2026-09-25 13:30:00	OPEN	\N	\N	2026-09-26 15:23:49.342071
27993	2662	7	TMS_DEFECT	9335	BALLAST_CUSHION_DEFICIT	\N	MAJOR	2026-09-25 14:15:00	OPEN	\N	\N	2026-09-26 15:23:49.342071
27994	2663	8	TDMS_FAILURE	9500	CANTILEVER_INSULATOR_FLASH	Flashover on 25kV cantilever bracket insulator Km 1343/18	HIGH	2026-09-25 15:00:00	UNRESOLVED	\N	\N	2026-09-26 15:23:49.457687
27995	2664	8	TDMS_FAILURE	9501	DROPPER_SLACK_OR_DISPLACED	Excessive stagger and displaced current droppers under thermal expansion	MEDIUM	2026-09-25 15:40:00	UNRESOLVED	\N	\N	2026-09-26 15:23:49.457687
27996	2663	8	TDMS_FAILURE	9502	CANTILEVER_INSULATOR_FLASH	\N	HIGH	2026-09-25 15:00:00	UNRESOLVED	\N	\N	2026-09-26 15:23:49.457687
27997	2664	8	TDMS_FAILURE	9503	DROPPER_SLACK_OR_DISPLACED	\N	MEDIUM	2026-09-25 15:40:00	UNRESOLVED	\N	\N	2026-09-26 15:23:49.457687
27998	2665	9	SMMS_ALERT	9329	POINT_OUT_OF_CORRESPONDENCE	\N	\N	2026-09-25 17:10:00	ACTIVE	\N	\N	2026-09-26 15:23:49.542385
27999	2666	9	SMMS_ALERT	9330	SIGNAL_RED_ASPECT_EXTINCTION	\N	\N	2026-09-25 17:35:00	ACTIVE	\N	\N	2026-09-26 15:23:49.542385
28000	2665	9	SMMS_ALERT	9331	MOTOR_OVERCURRENT_WARNING	Point machine current surge to 6.8A exceeding 5.2A threshold	\N	2026-09-25 15:45:00	ACTIVE	\N	cause_code=OBSTRUCTION_OR_DRY_SLIDE_CHAIR	2026-09-26 15:23:49.542385
28001	2666	9	SMMS_ALERT	9332	CABLE_INSULATION_DROP	Megger value dropped below 10 Mega-ohms on Home Signal tail cable	\N	2026-09-25 16:15:00	ACTIVE	\N	cause_code=MOISTURE_INGRESS_JUNCTION_BOX	2026-09-26 15:23:49.542385
28002	2668	7	TMS_DEFECT	9336	RAIL-IMR-01	Rail flaw requiring cut and weld piece renewal	CRITICAL	2026-09-26 13:30:00	OPEN	\N	\N	2026-09-26 15:25:32.678666
28003	2673	7	TMS_DEFECT	9337	ALIGN-DEV-02	Track gauge and cross level alignment deviation	MAJOR	2026-09-26 13:45:00	OPEN	\N	\N	2026-09-26 15:25:32.678666
28004	2675	7	TMS_DEFECT	9338	BALLAST-FOUL-03	Fouled ballast requiring deep screening & packing	MAJOR	2026-09-26 13:30:00	OPEN	\N	\N	2026-09-26 15:25:32.678666
28005	2677	8	TDMS_FAILURE	9504	OHE-INSUL-01	Section insulator tracking and carbon deposition	CRITICAL	2026-09-26 12:30:00	OPEN	\N	\N	2026-09-26 15:25:32.886362
28006	2670	9	SMMS_ALERT	9333	POINT_PEAK_CURRENT	Point 101A motor operating current above threshold	\N	2026-09-26 13:00:00	ACTIVE	\N	Point 101A motor operating current above threshold	2026-09-26 15:25:33.284068
28007	2671	9	SMMS_ALERT	9334	DETECTION_CONTACT_WEAR	Point 102B detection contact friction wear	\N	2026-09-26 13:15:00	ACTIVE	\N	Point 102B detection contact friction wear	2026-09-26 15:25:33.284068
\.


--
-- Data for Name: execution_outcome; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.execution_outcome (id, block_plan_id, block_plan_task_id, execution_status, actual_start, actual_end, actual_duration_minutes, outcome_code, remarks, recorded_at, created_at) FROM stdin;
1	92	\N	COMPLETED	2026-09-26 16:00:00	2026-09-26 17:15:00	75	\N	\N	2026-09-26 15:25:36.469278	2026-09-26 15:25:36.469278
\.


--
-- Data for Name: line_occupancy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.line_occupancy (id, station_code, line_number, occupancy_start, occupancy_end, occupancy_status, train_id, source_event_id, remarks) FROM stdin;
3080	AGC	UP-MAIN	2026-09-26 10:55:00	2026-09-26 12:00:00	OCCUPIED	2526	\N	Gatimaan Express arrival and turnaround on PF-1
3084	RKM	UP-MAIN	2026-09-26 10:55:00	2026-09-26 11:15:00	OCCUPIED	2522	\N	Bhopal Shatabdi UP Main line run through
3088	MTJ	UP-MAIN	2026-09-26 11:25:00	2026-09-26 11:45:00	OCCUPIED	2522	\N	Shatabdi passage on Mathura UP Main
3093	FAR	UP-MAIN	2026-09-26 13:45:00	2026-09-26 14:05:00	OCCUPIED	2527	\N	Farah block section Gatimaan passage
3098	BHA	DOWN-MAIN	2026-09-26 10:45:00	2026-09-26 11:10:00	OCCUPIED	2530	\N	Bhandai DOWN Main line Taj Express passage
3100	BHA	3RD-LINE	2026-09-26 10:00:00	2026-09-26 12:00:00	OCCUPIED	2525	\N	Bhandai goods loop occupied by coal rake
3102	AGC	UP-MAIN	2026-09-26 15:00:00	2026-09-26 16:00:00	OCCUPIED	2526	\N	Gatimaan arrival
3107	AGC	DOWN-MAIN	2026-09-26 17:00:00	2026-09-26 17:45:00	OCCUPIED	2530	\N	Taj Express departure
3109	AGC	DOWN-MAIN	2026-09-26 22:00:00	2026-09-26 22:45:00	OCCUPIED	2532	\N	Coal freight clearance
3116	MTJ	DOWN-MAIN	2026-09-26 20:45:00	2026-09-26 21:30:00	OCCUPIED	2524	\N	GT Express Mathura stop
3123	FAR	DOWN-MAIN	2026-09-26 10:55:00	2026-09-26 11:15:00	OCCUPIED	2524	\N	Farah-Raja Ki Mandi block section occupied
3078	AGC	UP-MAIN	2026-09-25 13:10:00	2026-09-25 13:35:00	OCCUPIED	2522	\N	\N
3081	AGC	UP-MAIN	2026-09-26 14:00:00	2026-09-26 14:35:00	OCCUPIED	2527	\N	Gatimaan Return Express departure
3083	AGC	DOWN-MAIN	2026-09-26 13:45:00	2026-09-26 14:15:00	OCCUPIED	2524	\N	Grand Trunk Express scheduled stop on PF-2
3085	RKM	UP-MAIN	2026-09-26 13:30:00	2026-09-26 13:55:00	OCCUPIED	2529	\N	Grand Trunk UP Return stop
3089	MTJ	UP-MAIN	2026-09-26 14:15:00	2026-09-26 14:45:00	OCCUPIED	2527	\N	Gatimaan Return passage on Mathura UP Main
3092	FAR	UP-MAIN	2026-09-26 11:05:00	2026-09-26 11:25:00	OCCUPIED	2522	\N	Farah block section clear behind Shatabdi
3094	FAR	DOWN-MAIN	2026-09-26 10:55:00	2026-09-26 11:15:00	OCCUPIED	2524	\N	Farah block section GT Express run-through
3097	BHA	UP-MAIN	2026-09-26 13:00:00	2026-09-26 13:30:00	OCCUPIED	2529	\N	Bhandai UP Main line GT Return passage
3099	BHA	DOWN-MAIN	2026-09-26 13:40:00	2026-09-26 14:05:00	OCCUPIED	2523	\N	Bhandai DOWN Main line Rajdhani passage
3101	BHA	3RD-LINE	2026-09-26 15:00:00	2026-09-26 17:00:00	OCCUPIED	2531	\N	Bhandai goods loop arrival of empty covered rake
3103	AGC	UP-MAIN	2026-09-26 17:30:00	2026-09-26 18:00:00	OCCUPIED	2522	\N	Shatabdi stop
3104	AGC	UP-MAIN	2026-09-26 21:00:00	2026-09-26 21:30:00	OCCUPIED	2529	\N	GT Express passenger halt
3108	AGC	DOWN-MAIN	2026-09-26 20:15:00	2026-09-26 21:00:00	OCCUPIED	2524	\N	GT Return stop
3110	RKM	UP-MAIN	2026-09-26 15:55:00	2026-09-26 16:15:00	OCCUPIED	2522	\N	Shatabdi RKM clear
3111	RKM	UP-MAIN	2026-09-26 18:15:00	2026-09-26 18:45:00	OCCUPIED	2529	\N	GT Express RKM clearance
3112	RKM	UP-MAIN	2026-09-26 21:30:00	2026-09-26 22:15:00	OCCUPIED	2527	\N	Gatimaan UP return passage
3113	RKM	UP-MAIN	2026-09-26 23:00:00	2026-09-26 23:45:00	OCCUPIED	2531	\N	Container freight through
3114	MTJ	DOWN-MAIN	2026-09-26 16:10:00	2026-09-26 16:30:00	OCCUPIED	2523	\N	Rajdhani clearance
3115	MTJ	DOWN-MAIN	2026-09-26 17:45:00	2026-09-26 18:15:00	OCCUPIED	2530	\N	Taj Express stop
3119	BHA	3RD-LINE	2026-09-26 20:00:00	2026-09-26 22:00:00	OCCUPIED	2531	\N	Container train reception
3121	RKM	UP-MAIN	2026-09-26 10:55:00	2026-09-26 11:15:00	OCCUPIED	2522	\N	UP Main Line clear block behind Shatabdi
3122	MTJ	DOWN-MAIN	2026-09-26 10:55:00	2026-09-26 11:05:00	OCCUPIED	2523	\N	Tejas Rajdhani platform 2 clearance
3079	AGC	UP-MAIN	2026-09-25 13:35:00	2026-09-25 14:00:00	OCCUPIED	2523	\N	\N
3082	AGC	DOWN-MAIN	2026-09-26 11:25:00	2026-09-26 11:45:00	OCCUPIED	2523	\N	Tejas Rajdhani scheduled departure on PF-2
3086	RKM	DOWN-MAIN	2026-09-26 10:15:00	2026-09-26 10:45:00	OCCUPIED	2530	\N	Taj Express scheduled stop
3087	RKM	DOWN-MAIN	2026-09-26 12:45:00	2026-09-26 13:05:00	OCCUPIED	2523	\N	Tejas Rajdhani passage
3090	MTJ	DOWN-MAIN	2026-09-26 10:55:00	2026-09-26 11:05:00	OCCUPIED	2523	\N	Tejas Rajdhani Mathura PF-2 departure
3091	MTJ	DOWN-MAIN	2026-09-26 13:00:00	2026-09-26 13:25:00	OCCUPIED	2524	\N	Grand Trunk Express stop Mathura PF-2
3095	FAR	DOWN-MAIN	2026-09-26 13:10:00	2026-09-26 13:30:00	OCCUPIED	2523	\N	Farah block section Rajdhani run-through
3096	BHA	UP-MAIN	2026-09-26 10:00:00	2026-09-26 10:20:00	OCCUPIED	2522	\N	Bhandai UP Main line Shatabdi clearance
3105	AGC	UP-MAIN	2026-09-26 22:30:00	2026-09-26 23:00:00	OCCUPIED	2527	\N	Gatimaan Return departure
3106	AGC	DOWN-MAIN	2026-09-26 14:50:00	2026-09-26 15:30:00	OCCUPIED	2523	\N	Tejas Rajdhani passage
3117	MTJ	DOWN-MAIN	2026-09-26 22:30:00	2026-09-26 23:15:00	OCCUPIED	2532	\N	Coal freight run through
3118	BHA	3RD-LINE	2026-09-26 13:30:00	2026-09-26 15:00:00	OCCUPIED	2532	\N	Coal rake holding in loop
3120	AGC	UP-MAIN	2026-09-26 10:55:00	2026-09-26 11:30:00	OCCUPIED	2526	\N	Platform 1 hold Gatimaan Express
3124	BHA	3RD-LINE	2026-09-26 10:00:00	2026-09-26 12:00:00	OCCUPIED	2525	\N	Goods siding occupied by coal rake
\.


--
-- Data for Name: location_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.location_master (id, zone_code, zone_name, division_code, division_name, section_code, section_name, station_code, station_name, line_code, line_name, km_start, km_end, latitude, longitude) FROM stdin;
433	NCR	North Central Railway	AGC	Agra Division	AGC-MTJ	Agra Cantt - Mathura Jn	AGC	Agra Cantt	UP-MAIN	UP Main Line	1341.200	1345.800	27.158400	77.991200
434	NCR	North Central Railway	AGC	Agra Division	AGC-MTJ	Agra Cantt - Mathura Jn	RKM	Raja Ki Mandi	UP-MAIN	UP Main Line	1345.800	1349.500	27.201500	77.997200
435	NCR	North Central Railway	AGC	Agra Division	AGC-MTJ	Agra Cantt - Mathura Jn	MTJ	Mathura Jn	UP-MAIN	UP Main Line	1390.000	1395.200	27.492400	77.673700
436	NCR	\N	AGC	\N	PWL-AGC	\N	AGC	Agra Cantt	DOWN-MAIN	DOWN Main Line	1340.000	1345.000	\N	\N
437	NCR	\N	AGC	\N	AGC-MTJ	\N	RKM	Raja Ki Mandi	DOWN-MAIN	DOWN Main Line	1345.000	1349.000	\N	\N
438	NCR	\N	AGC	\N	AGC-MTJ	\N	MTJ	Mathura Junction	DOWN-MAIN	DOWN Main Line	1395.000	1402.000	\N	\N
439	NCR	\N	AGC	\N	AGC-JHS	\N	BHA	Bhandai	3RD-LINE	Goods Loop Siding	1332.000	1336.000	\N	\N
440	NCR	\N	AGC	\N	AGC-BHA	Agra Cantt - Bhandai	BHA	Bhandai Jn	UP-MAIN	UP Main Line	1330.000	1335.000	27.085000	78.012000
441	NCR	\N	AGC	\N	AGC-BHA	Agra Cantt - Bhandai	BHA	Bhandai Jn	DOWN-MAIN	DOWN Main Line	1330.000	1335.000	27.085000	78.012000
442	NCR	\N	AGC	\N	AGC-MTJ	Agra Cantt - Mathura Jn	FAR	Farah Town	UP-MAIN	UP Main Line	1368.000	1373.000	27.324000	77.781000
443	NCR	\N	AGC	\N	AGC-MTJ	Agra Cantt - Mathura Jn	FAR	Farah Town	DOWN-MAIN	DOWN Main Line	1368.000	1373.000	27.324000	77.781000
\.


--
-- Data for Name: maintenance_requirement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance_requirement (id, asset_id, source_system_id, source_record_type, source_record_id, defect_failure_id, maintenance_type, description, required_duration_minutes, planned_date, status, remarks, created_at) FROM stdin;
28121	2661	7	TMS_MAINTENANCE	9332	27990	RAIL_CUT_AND_REPLACE	Requires 90 min traffic block with rail cutting & welding kit GANG-02	\N	2026-09-26 08:30:00	SCHEDULED	\N	2026-09-26 15:23:49.342071
28122	2662	7	TMS_MAINTENANCE	9333	27991	BALLAST_DEEP_SCREENING	Requires 180 min traffic block with BCM-NCR-04 and tamping machine CSM-NCR-10	\N	2026-09-26 10:00:00	SCHEDULED	\N	2026-09-26 15:23:49.342071
28123	2661	7	TMS_MAINTENANCE	9334	27992	RAIL_CUT_AND_REPLACE	Requires 90 min traffic block with rail cutting & welding kit GANG-02	90	2026-09-26 12:00:00	SCHEDULED	\N	2026-09-26 15:23:49.342071
28124	2662	7	TMS_MAINTENANCE	9335	27993	BALLAST_DEEP_SCREENING	Requires 120 min traffic block with BCM-NCR-04 and tamping machine CSM-NCR-10	120	2026-09-26 11:15:00	SCHEDULED	\N	2026-09-26 15:23:49.342071
28125	2663	8	TDMS_MAINTENANCE	9635	27994	POWER_BLOCK_ISOLATION_REPAIR	Requires 25kV OHE isolation and Tower Wagon TW-AGC-01	\N	2026-09-26 07:00:00	SCHEDULED	\N	2026-09-26 15:23:49.457687
28126	2664	8	TDMS_MAINTENANCE	9636	27995	OHE_STAGGER_ADJUSTMENT	Requires 75 min OHE power block with ladder trolley or tower wagon	\N	2026-09-26 08:15:00	SCHEDULED	\N	2026-09-26 15:23:49.457687
28127	2663	8	TDMS_MAINTENANCE	9637	27996	POWER_BLOCK_ISOLATION_REPAIR	Requires 25kV OHE isolation and Tower Wagon TW-AGC-01	75	2026-09-26 12:00:00	SCHEDULED	\N	2026-09-26 15:23:49.457687
28128	2664	8	TDMS_MAINTENANCE	9638	27997	OHE_STAGGER_ADJUSTMENT	Requires 90 min OHE power block with ladder trolley or tower wagon	90	2026-09-26 11:45:00	SCHEDULED	\N	2026-09-26 15:23:49.457687
28129	2665	9	SMMS_MAINTENANCE	9329	27998	POINT_MOTOR_OVERHAUL	Disconnect circuit, replace detector slide and test correspondence with panel	\N	2026-09-26 07:30:00	SCHEDULED	\N	2026-09-26 15:23:49.542385
28130	2666	9	SMMS_MAINTENANCE	9330	27999	LED_UNIT_REPLACEMENT	Replace red aspect LED optical unit and verify feedback relay pickup	\N	2026-09-26 08:00:00	SCHEDULED	\N	2026-09-26 15:23:49.542385
28131	2665	9	SMMS_MAINTENANCE	9331	28000	POINT_MACHINE_OVERHAUL	Requires 90 min traffic/signalling block with ESM gang	90	2026-09-26 11:45:00	SCHEDULED	\N	2026-09-26 15:23:49.542385
28132	2666	9	SMMS_MAINTENANCE	9332	28001	SIGNAL_CABLE_RENEWAL	Requires 60 min signalling block with signal gang	60	2026-09-26 11:15:00	SCHEDULED	\N	2026-09-26 15:23:49.542385
28133	2668	7	TMS_MAINTENANCE	9336	28002	RAIL_CUT_AND_WELD	\N	75	2026-09-26 15:30:00	PLANNED	\N	2026-09-26 15:25:32.678666
28134	2673	7	TMS_MAINTENANCE	9337	28003	TRACK_TAMPING_AND_LINING	\N	100	2026-09-26 15:30:00	PLANNED	\N	2026-09-26 15:25:32.678666
28135	2675	7	TMS_MAINTENANCE	9338	28004	BALLAST_DEEP_SCREENING	\N	120	2026-09-26 16:30:00	PLANNED	\N	2026-09-26 15:25:32.678666
28136	2677	8	TDMS_MAINTENANCE	9639	28005	OHE_INSULATOR_REPLACEMENT	\N	90	2026-09-26 14:30:00	PLANNED	\N	2026-09-26 15:25:32.886362
28137	2670	9	SMMS_MAINTENANCE	9333	\N	POINT_MACHINE_OVERHAUL	\N	120	2026-09-26 16:30:00	PLANNED	\N	2026-09-26 15:25:33.284068
28138	2671	9	SMMS_MAINTENANCE	9334	\N	POINT_DETECTION_OVERHAUL	\N	120	2026-09-26 17:30:00	PLANNED	\N	2026-09-26 15:25:33.284068
28139	2674	9	SMMS_MAINTENANCE	9335	\N	SIGNAL_CABLE_REPLACEMENT	\N	110	2026-09-26 16:00:00	PLANNED	\N	2026-09-26 15:25:33.284068
\.


--
-- Data for Name: operational_event; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operational_event (id, train_id, station_code, event_type, event_datetime, description, source_event_id, remarks) FROM stdin;
7100	2523	MTJ	LINE_CLEAR_RECEIVED	2026-09-26 10:55:00	Line clear granted from Farah for Rajdhani	\N	\N
7098	2522	AGC	CAUTION_ORDER_ISSUED	2026-09-25 12:20:00	Speed restriction 30 km/h between km 1342-1343 due to weld fracture indication	\N	\N
7099	2522	RKM	CAUTION_ORDER_ACTIVE	2026-09-26 10:55:00	Speed restriction 30 km/h Km 1345-1347 on UP-MAIN	\N	\N
\.


--
-- Data for Name: optimization_input; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.optimization_input (id, optimization_run_id, planning_task_id, candidate_block_window_id, planning_constraint_id, planning_resource_id, task_dependency_id, input_role, created_at) FROM stdin;
\.


--
-- Data for Name: optimization_output; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.optimization_output (id, optimization_run_id, planning_task_id, candidate_block_window_id, output_type, output_status, selected, output_payload, created_at) FROM stdin;
\.


--
-- Data for Name: optimization_run; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.optimization_run (id, run_code, run_type, status, requested_at, started_at, completed_at, model_name, model_version, input_snapshot_hash, output_snapshot_hash, objective_description, error_message, created_at, updated_at) FROM stdin;
14	OPT-AGRA-CORRIDOR-1790416558	PLANNING	COMPLETED	2026-09-26 15:25:35.811164	\N	\N	DeterministicConstraintOptimizer	2.0-IR-NCR-AGRA	\N	\N	\N	\N	2026-09-26 15:25:35.811164	2026-09-26 15:25:35.811164
\.


--
-- Data for Name: plan_validation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_validation (id, block_plan_id, validation_type, validation_status, validation_message, validated_at, validator_version, created_at) FROM stdin;
377	92	PLAN_COMPLETENESS	FAILED	BLOCK_PLAN_HAS_NO_TASKS	2026-09-26 15:25:35.970725	STEP10-DETERMINISTIC-1.0	2026-09-26 15:25:35.970725
378	93	PLAN_COMPLETENESS	FAILED	BLOCK_PLAN_HAS_NO_TASKS	2026-09-26 15:25:36.120835	STEP10-DETERMINISTIC-1.0	2026-09-26 15:25:36.120835
379	94	PLAN_COMPLETENESS	FAILED	BLOCK_PLAN_HAS_NO_TASKS	2026-09-26 15:25:36.266766	STEP10-DETERMINISTIC-1.0	2026-09-26 15:25:36.266766
\.


--
-- Data for Name: planning_constraint; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.planning_constraint (id, planning_task_id, constraint_type, constraint_value, hard_constraint, effective_start, effective_end, description, source, created_at) FROM stdin;
64030	27273	DURATION	90	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Required duration of 90 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64031	27273	TIME_WINDOW	2026-09-26T12:00:00|2026-09-26T14:00:00	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64032	27273	LOCATION	AGC	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Location constraint: station AGC	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64033	27273	LINE	UP-MAIN	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Line constraint: UP-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64034	27273	TRAFFIC_BLOCK	TRUE	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Traffic block access required	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64035	27274	DURATION	120	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Required duration of 120 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64036	27274	TIME_WINDOW	2026-09-26T11:15:00|2026-09-26T13:30:00	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64037	27274	LOCATION	RKM	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Location constraint: station RKM	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64038	27274	LINE	UP-MAIN	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Line constraint: UP-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64039	27274	TRAFFIC_BLOCK	TRUE	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Traffic block access required	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64040	27277	DURATION	75	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Required duration of 75 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64041	27277	TIME_WINDOW	2026-09-26T12:00:00|2026-09-26T14:00:00	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64042	27277	LOCATION	AGC	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Location constraint: station AGC	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64043	27277	LINE	UP-MAIN	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Line constraint: UP-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64044	27277	POWER_BLOCK	TRUE	t	2026-09-26 12:00:00	2026-09-26 14:00:00	Power block access required	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64045	27278	DURATION	90	t	2026-09-26 11:45:00	2026-09-26 14:15:00	Required duration of 90 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64046	27278	TIME_WINDOW	2026-09-26T11:45:00|2026-09-26T14:15:00	t	2026-09-26 11:45:00	2026-09-26 14:15:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64047	27278	LOCATION	MTJ	t	2026-09-26 11:45:00	2026-09-26 14:15:00	Location constraint: station MTJ	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64048	27278	LINE	UP-MAIN	t	2026-09-26 11:45:00	2026-09-26 14:15:00	Line constraint: UP-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64049	27278	POWER_BLOCK	TRUE	t	2026-09-26 11:45:00	2026-09-26 14:15:00	Power block access required	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64050	27281	DURATION	90	t	2026-09-26 11:45:00	2026-09-26 13:45:00	Required duration of 90 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64051	27281	TIME_WINDOW	2026-09-26T11:45:00|2026-09-26T13:45:00	t	2026-09-26 11:45:00	2026-09-26 13:45:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64052	27281	LOCATION	AGC	t	2026-09-26 11:45:00	2026-09-26 13:45:00	Location constraint: station AGC	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64053	27281	LINE	DOWN-MAIN	t	2026-09-26 11:45:00	2026-09-26 13:45:00	Line constraint: DOWN-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64054	27281	TRAFFIC_BLOCK	TRUE	t	2026-09-26 11:45:00	2026-09-26 13:45:00	Traffic block access required	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64055	27282	DURATION	60	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Required duration of 60 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64056	27282	TIME_WINDOW	2026-09-26T11:15:00|2026-09-26T13:30:00	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64057	27282	LOCATION	RKM	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Location constraint: station RKM	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64058	27282	LINE	UP-MAIN	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Line constraint: UP-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64059	27282	TRAFFIC_BLOCK	TRUE	t	2026-09-26 11:15:00	2026-09-26 13:30:00	Traffic block access required	BLOCK_REQUIREMENT	2026-09-26 15:23:53.545493
64060	27285	DURATION	75	t	2026-09-26 15:30:00	2026-09-26 21:30:00	Required duration of 75 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64061	27285	TIME_WINDOW	2026-09-26T15:30:00|2026-09-26T21:30:00	t	2026-09-26 15:30:00	2026-09-26 21:30:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64062	27285	LOCATION	AGC	t	2026-09-26 15:30:00	2026-09-26 21:30:00	Location constraint: station AGC	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64063	27285	LINE	UP-MAIN	t	2026-09-26 15:30:00	2026-09-26 21:30:00	Line constraint: UP-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64064	27286	DURATION	100	t	2026-09-26 15:30:00	2026-09-26 22:00:00	Required duration of 100 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64065	27286	TIME_WINDOW	2026-09-26T15:30:00|2026-09-26T22:00:00	t	2026-09-26 15:30:00	2026-09-26 22:00:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64066	27286	LOCATION	RKM	t	2026-09-26 15:30:00	2026-09-26 22:00:00	Location constraint: station RKM	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64067	27286	LINE	UP-MAIN	t	2026-09-26 15:30:00	2026-09-26 22:00:00	Line constraint: UP-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64068	27287	DURATION	120	t	2026-09-26 16:30:00	2026-09-26 21:30:00	Required duration of 120 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64069	27287	TIME_WINDOW	2026-09-26T16:30:00|2026-09-26T21:30:00	t	2026-09-26 16:30:00	2026-09-26 21:30:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64070	27287	LOCATION	MTJ	t	2026-09-26 16:30:00	2026-09-26 21:30:00	Location constraint: station MTJ	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64071	27287	LINE	DOWN-MAIN	t	2026-09-26 16:30:00	2026-09-26 21:30:00	Line constraint: DOWN-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64072	27288	DURATION	90	t	2026-09-26 13:30:00	2026-09-26 18:00:00	Required duration of 90 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64073	27288	TIME_WINDOW	2026-09-26T13:30:00|2026-09-26T18:00:00	t	2026-09-26 13:30:00	2026-09-26 18:00:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64074	27288	LOCATION	MTJ	t	2026-09-26 13:30:00	2026-09-26 18:00:00	Location constraint: station MTJ	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64075	27288	LINE	DOWN-MAIN	t	2026-09-26 13:30:00	2026-09-26 18:00:00	Line constraint: DOWN-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64076	27289	DURATION	120	t	2026-09-26 16:30:00	2026-09-26 21:00:00	Required duration of 120 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64077	27289	TIME_WINDOW	2026-09-26T16:30:00|2026-09-26T21:00:00	t	2026-09-26 16:30:00	2026-09-26 21:00:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64078	27289	LOCATION	AGC	t	2026-09-26 16:30:00	2026-09-26 21:00:00	Location constraint: station AGC	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64079	27289	LINE	UP-MAIN	t	2026-09-26 16:30:00	2026-09-26 21:00:00	Line constraint: UP-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64080	27290	DURATION	120	t	2026-09-26 16:30:00	2026-09-26 21:00:00	Required duration of 120 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64081	27290	TIME_WINDOW	2026-09-26T16:30:00|2026-09-26T21:00:00	t	2026-09-26 16:30:00	2026-09-26 21:00:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64082	27290	LOCATION	AGC	t	2026-09-26 16:30:00	2026-09-26 21:00:00	Location constraint: station AGC	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64083	27290	LINE	DOWN-MAIN	t	2026-09-26 16:30:00	2026-09-26 21:00:00	Line constraint: DOWN-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64084	27291	DURATION	110	t	2026-09-26 15:30:00	2026-09-26 22:00:00	Required duration of 110 minutes derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64085	27291	TIME_WINDOW	2026-09-26T15:30:00|2026-09-26T22:00:00	t	2026-09-26 15:30:00	2026-09-26 22:00:00	Earliest start / latest end window derived from block requirement	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64086	27291	LOCATION	RKM	t	2026-09-26 15:30:00	2026-09-26 22:00:00	Location constraint: station RKM	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
64087	27291	LINE	UP-MAIN	t	2026-09-26 15:30:00	2026-09-26 22:00:00	Line constraint: UP-MAIN	BLOCK_REQUIREMENT	2026-09-26 15:25:34.212917
\.


--
-- Data for Name: planning_priority; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.planning_priority (id, planning_task_id, criticality_level, urgency_level, safety_impact, asset_availability_impact, traffic_impact, failure_recurrence, defect_age_days, priority_score, priority_band, calculation_version, calculated_at, calculation_reason, created_at, updated_at) FROM stdin;
218	27273	CRITICAL	IMMEDIATE	CRITICAL	MEDIUM	HIGH	MEDIUM	0	81.50	CRITICAL	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=CRITICAL; urgency=IMMEDIATE; safety_impact=CRITICAL; asset_availability_impact=MEDIUM; traffic_impact=HIGH; failure_recurrence=MEDIUM; defect_age_days=0; source severity CRITICAL mapped; deadline within 0.2d -> IMMEDIATE; traffic block required -> MEDIUM; block_requirement.traffic_block_required -> HIGH; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.379091	2026-09-26 15:43:11.379091
219	27274	LOW	IMMEDIATE	NONE	MEDIUM	HIGH	MEDIUM	0	38.50	MEDIUM	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=IMMEDIATE; safety_impact=NONE; asset_availability_impact=MEDIUM; traffic_impact=HIGH; failure_recurrence=MEDIUM; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; deadline within 0.1d -> IMMEDIATE; traffic block required -> MEDIUM; block_requirement.traffic_block_required -> HIGH; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.40214	2026-09-26 15:43:11.40214
220	27275	CRITICAL	LOW	CRITICAL	LOW	NONE	MEDIUM	0	54.00	HIGH	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=CRITICAL; urgency=LOW; safety_impact=CRITICAL; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=MEDIUM; defect_age_days=0; source severity CRITICAL mapped; no deadline (block_requirement.latest_end) -> urgency LOW; no block requirement -> availability impact LOW (floor); no traffic block evidence -> NONE; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.422405	2026-09-26 15:43:11.422405
221	27276	LOW	LOW	NONE	LOW	NONE	MEDIUM	0	11.00	LOW	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=LOW; safety_impact=NONE; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=MEDIUM; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; no deadline (block_requirement.latest_end) -> urgency LOW; no block requirement -> availability impact LOW (floor); no traffic block evidence -> NONE; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.435269	2026-09-26 15:43:11.435269
222	27277	HIGH	IMMEDIATE	HIGH	MEDIUM	NONE	MEDIUM	0	60.50	HIGH	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=HIGH; urgency=IMMEDIATE; safety_impact=HIGH; asset_availability_impact=MEDIUM; traffic_impact=NONE; failure_recurrence=MEDIUM; defect_age_days=0; source severity HIGH mapped; deadline within 0.2d -> IMMEDIATE; power block required -> MEDIUM; no traffic block evidence -> NONE; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.442209	2026-09-26 15:43:11.442209
223	27278	MEDIUM	IMMEDIATE	MEDIUM	MEDIUM	NONE	MEDIUM	0	47.00	MEDIUM	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=MEDIUM; urgency=IMMEDIATE; safety_impact=MEDIUM; asset_availability_impact=MEDIUM; traffic_impact=NONE; failure_recurrence=MEDIUM; defect_age_days=0; source severity MEDIUM mapped; deadline within 0.2d -> IMMEDIATE; power block required -> MEDIUM; no traffic block evidence -> NONE; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.456366	2026-09-26 15:43:11.456366
224	27279	HIGH	LOW	HIGH	LOW	NONE	MEDIUM	0	41.00	MEDIUM	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=HIGH; urgency=LOW; safety_impact=HIGH; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=MEDIUM; defect_age_days=0; source severity HIGH mapped; no deadline (block_requirement.latest_end) -> urgency LOW; no block requirement -> availability impact LOW (floor); no traffic block evidence -> NONE; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.463003	2026-09-26 15:43:11.463003
225	27280	MEDIUM	LOW	MEDIUM	LOW	NONE	MEDIUM	0	27.50	MEDIUM	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=MEDIUM; urgency=LOW; safety_impact=MEDIUM; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=MEDIUM; defect_age_days=0; source severity MEDIUM mapped; no deadline (block_requirement.latest_end) -> urgency LOW; no block requirement -> availability impact LOW (floor); no traffic block evidence -> NONE; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.468651	2026-09-26 15:43:11.468651
226	27281	LOW	IMMEDIATE	NONE	MEDIUM	HIGH	MEDIUM	0	38.50	MEDIUM	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=IMMEDIATE; safety_impact=NONE; asset_availability_impact=MEDIUM; traffic_impact=HIGH; failure_recurrence=MEDIUM; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; deadline within 0.1d -> IMMEDIATE; traffic block required -> MEDIUM; block_requirement.traffic_block_required -> HIGH; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.474111	2026-09-26 15:43:11.474111
227	27282	LOW	IMMEDIATE	NONE	MEDIUM	HIGH	MEDIUM	0	38.50	MEDIUM	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=IMMEDIATE; safety_impact=NONE; asset_availability_impact=MEDIUM; traffic_impact=HIGH; failure_recurrence=MEDIUM; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; deadline within 0.1d -> IMMEDIATE; traffic block required -> MEDIUM; block_requirement.traffic_block_required -> HIGH; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.480811	2026-09-26 15:43:11.480811
228	27283	LOW	LOW	NONE	LOW	NONE	MEDIUM	0	11.00	LOW	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=LOW; safety_impact=NONE; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=MEDIUM; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; no deadline (block_requirement.latest_end) -> urgency LOW; no block requirement -> availability impact LOW (floor); no traffic block evidence -> NONE; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.487838	2026-09-26 15:43:11.487838
229	27284	LOW	LOW	NONE	LOW	NONE	MEDIUM	0	11.00	LOW	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=LOW; safety_impact=NONE; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=MEDIUM; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; no deadline (block_requirement.latest_end) -> urgency LOW; no block requirement -> availability impact LOW (floor); no traffic block evidence -> NONE; 2 defect/failure records in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.494478	2026-09-26 15:43:11.494478
230	27285	CRITICAL	IMMEDIATE	CRITICAL	LOW	NONE	LOW	0	65.75	HIGH	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=CRITICAL; urgency=IMMEDIATE; safety_impact=CRITICAL; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=LOW; defect_age_days=0; source severity CRITICAL mapped; deadline within 0.5d -> IMMEDIATE; no explicit operational block constraints -> LOW (floor); no traffic block evidence -> NONE; 1 defect/failure record(s) in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.502549	2026-09-26 15:43:11.502549
231	27286	LOW	IMMEDIATE	NONE	LOW	NONE	LOW	0	22.75	LOW	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=IMMEDIATE; safety_impact=NONE; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=LOW; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; deadline within 0.5d -> IMMEDIATE; no explicit operational block constraints -> LOW (floor); no traffic block evidence -> NONE; 1 defect/failure record(s) in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.50956	2026-09-26 15:43:11.50956
232	27287	LOW	IMMEDIATE	NONE	LOW	NONE	LOW	0	22.75	LOW	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=IMMEDIATE; safety_impact=NONE; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=LOW; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; deadline within 0.5d -> IMMEDIATE; no explicit operational block constraints -> LOW (floor); no traffic block evidence -> NONE; 1 defect/failure record(s) in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.518139	2026-09-26 15:43:11.518139
233	27288	CRITICAL	IMMEDIATE	CRITICAL	LOW	NONE	LOW	0	65.75	HIGH	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=CRITICAL; urgency=IMMEDIATE; safety_impact=CRITICAL; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=LOW; defect_age_days=0; source severity CRITICAL mapped; deadline within 0.3d -> IMMEDIATE; no explicit operational block constraints -> LOW (floor); no traffic block evidence -> NONE; 1 defect/failure record(s) in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.525426	2026-09-26 15:43:11.525426
234	27289	LOW	IMMEDIATE	NONE	LOW	NONE	LOW	0	22.75	LOW	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=IMMEDIATE; safety_impact=NONE; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=LOW; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; deadline within 0.4d -> IMMEDIATE; no explicit operational block constraints -> LOW (floor); no traffic block evidence -> NONE; 1 defect/failure record(s) in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.541124	2026-09-26 15:43:11.541124
235	27290	LOW	IMMEDIATE	NONE	LOW	NONE	LOW	0	22.75	LOW	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=IMMEDIATE; safety_impact=NONE; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=LOW; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; deadline within 0.4d -> IMMEDIATE; no explicit operational block constraints -> LOW (floor); no traffic block evidence -> NONE; 1 defect/failure record(s) in 365d lookback; defect age 0 day(s) since detection	2026-09-26 15:43:11.548827	2026-09-26 15:43:11.548827
236	27291	LOW	IMMEDIATE	NONE	LOW	NONE	NONE	0	21.50	LOW	STEP12-DETERMINISTIC-1.0	2026-09-26 10:13:11.378035	criticality=LOW; urgency=IMMEDIATE; safety_impact=NONE; asset_availability_impact=LOW; traffic_impact=NONE; failure_recurrence=NONE; defect_age_days=0; severity missing/unknown -> safety NONE, criticality LOW; deadline within 0.5d -> IMMEDIATE; no explicit operational block constraints -> LOW (floor); no traffic block evidence -> NONE; no defect/failure history in lookback window; no detection date -> defect age 0 (explicit missing-date handling)	2026-09-26 15:43:11.557523	2026-09-26 15:43:11.557523
\.


--
-- Data for Name: planning_resource; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.planning_resource (id, resource_code, resource_type, resource_name, description, capacity, unit, status, location_code, source_system_id, created_at, updated_at) FROM stdin;
393	RES-AGC-PWAY-01	GANG	Agra Permanent Way Track Welding Gang	\N	\N	\N	AVAILABLE	AGC	\N	2026-09-26 15:25:34.42868	2026-09-26 15:25:34.42868
396	RES-RKM-SIG-01	GANG	Raja Ki Mandi Signal Maintainer Gang	\N	\N	\N	AVAILABLE	RKM	\N	2026-09-26 15:25:34.696949	2026-09-26 15:25:34.696949
398	RES-MTJ-TRD-01	MACHINERY	Mathura Traction Distribution Tower Wagon	\N	\N	\N	AVAILABLE	MTJ	\N	2026-09-26 15:25:34.817831	2026-09-26 15:25:34.817831
388	TW-AGC-01	TOWER_WAGON	8-Wheeler Tower Wagon AGC Base	\N	1	MACHINES	AVAILABLE	AGC	\N	2026-09-26 15:22:52.123621	2026-09-26 15:22:52.123621
389	CSM-NCR-10	TAMPING_MACHINE	Continuous Action Tamping Machine CSM-10	\N	1	MACHINES	AVAILABLE	AGC	\N	2026-09-26 15:22:52.286092	2026-09-26 15:22:52.286092
391	WELD-GANG-02	WELDING_GANG	Alumino-Thermit Rail Welding Gang No 2	\N	1	MACHINES	AVAILABLE	AGC	\N	2026-09-26 15:22:52.578949	2026-09-26 15:22:52.578949
394	RES-AGC-ESM-01	GANG	Agra Electrical Signal Maintainer Gang	\N	\N	\N	AVAILABLE	AGC	\N	2026-09-26 15:25:34.523325	2026-09-26 15:25:34.523325
397	RES-MTJ-PWAY-01	GANG	Mathura Track Deep Screening Gang	\N	\N	\N	AVAILABLE	MTJ	\N	2026-09-26 15:25:34.761241	2026-09-26 15:25:34.761241
390	BCM-NCR-04	BALLAST_CLEANING_MACHINE	Plasser Ballast Cleaning Machine BCM-04	\N	1	MACHINES	AVAILABLE	MTJ	\N	2026-09-26 15:22:52.419364	2026-09-26 15:22:52.419364
392	ESM-GANG-01	MANPOWER	Electronic Signal Maintainer Gang	\N	6	PERSONNEL	AVAILABLE	AGC	9	2026-09-26 15:23:47.715334	2026-09-26 15:23:47.715334
395	RES-RKM-PWAY-01	GANG	Raja Ki Mandi Track Maintenance Gang	\N	\N	\N	AVAILABLE	RKM	\N	2026-09-26 15:25:34.618096	2026-09-26 15:25:34.618096
\.


--
-- Data for Name: planning_task; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.planning_task (id, maintenance_requirement_id, block_requirement_id, asset_id, task_code, task_type, description, status, earliest_start, latest_end, duration_minutes, location_code, created_at, updated_at) FROM stdin;
27273	28121	26711	2661	PT-028121	RAIL_CUT_AND_REPLACE	Requires 90 min traffic block with rail cutting & welding kit GANG-02	OPEN	2026-09-26 12:00:00	2026-09-26 14:00:00	90	AGC	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27274	28122	26712	2662	PT-028122	BALLAST_DEEP_SCREENING	Requires 180 min traffic block with BCM-NCR-04 and tamping machine CSM-NCR-10	OPEN	2026-09-26 11:15:00	2026-09-26 13:30:00	120	RKM	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27275	28123	\N	2661	PT-028123	RAIL_CUT_AND_REPLACE	Requires 90 min traffic block with rail cutting & welding kit GANG-02	OPEN	\N	\N	90	\N	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27276	28124	\N	2662	PT-028124	BALLAST_DEEP_SCREENING	Requires 120 min traffic block with BCM-NCR-04 and tamping machine CSM-NCR-10	OPEN	\N	\N	120	\N	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27277	28125	26713	2663	PT-028125	POWER_BLOCK_ISOLATION_REPAIR	Requires 25kV OHE isolation and Tower Wagon TW-AGC-01	OPEN	2026-09-26 12:00:00	2026-09-26 14:00:00	75	AGC	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27278	28126	26714	2664	PT-028126	OHE_STAGGER_ADJUSTMENT	Requires 75 min OHE power block with ladder trolley or tower wagon	OPEN	2026-09-26 11:45:00	2026-09-26 14:15:00	90	MTJ	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27279	28127	\N	2663	PT-028127	POWER_BLOCK_ISOLATION_REPAIR	Requires 25kV OHE isolation and Tower Wagon TW-AGC-01	OPEN	\N	\N	75	\N	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27280	28128	\N	2664	PT-028128	OHE_STAGGER_ADJUSTMENT	Requires 90 min OHE power block with ladder trolley or tower wagon	OPEN	\N	\N	90	\N	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27281	28129	26715	2665	PT-028129	POINT_MOTOR_OVERHAUL	Disconnect circuit, replace detector slide and test correspondence with panel	OPEN	2026-09-26 11:45:00	2026-09-26 13:45:00	90	AGC	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27282	28130	26716	2666	PT-028130	LED_UNIT_REPLACEMENT	Replace red aspect LED optical unit and verify feedback relay pickup	OPEN	2026-09-26 11:15:00	2026-09-26 13:30:00	60	RKM	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27283	28131	\N	2665	PT-028131	POINT_MACHINE_OVERHAUL	Requires 90 min traffic/signalling block with ESM gang	OPEN	\N	\N	90	\N	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27284	28132	\N	2666	PT-028132	SIGNAL_CABLE_RENEWAL	Requires 60 min signalling block with signal gang	OPEN	\N	\N	60	\N	2026-09-26 15:23:53.459674	2026-09-26 15:23:53.459674
27285	28133	26717	2668	PT-028133	RAIL_CUT_AND_WELD	\N	OPEN	2026-09-26 15:30:00	2026-09-26 21:30:00	75	AGC	2026-09-26 15:25:34.113689	2026-09-26 15:25:34.113689
27286	28134	26720	2673	PT-028134	TRACK_TAMPING_AND_LINING	\N	OPEN	2026-09-26 15:30:00	2026-09-26 22:00:00	100	RKM	2026-09-26 15:25:34.113689	2026-09-26 15:25:34.113689
27287	28135	26722	2675	PT-028135	BALLAST_DEEP_SCREENING	\N	OPEN	2026-09-26 16:30:00	2026-09-26 21:30:00	120	MTJ	2026-09-26 15:25:34.113689	2026-09-26 15:25:34.113689
27288	28136	26723	2677	PT-028136	OHE_INSULATOR_REPLACEMENT	\N	OPEN	2026-09-26 13:30:00	2026-09-26 18:00:00	90	MTJ	2026-09-26 15:25:34.113689	2026-09-26 15:25:34.113689
27289	28137	26718	2670	PT-028137	POINT_MACHINE_OVERHAUL	\N	OPEN	2026-09-26 16:30:00	2026-09-26 21:00:00	120	AGC	2026-09-26 15:25:34.113689	2026-09-26 15:25:34.113689
27290	28138	26719	2671	PT-028138	POINT_DETECTION_OVERHAUL	\N	OPEN	2026-09-26 16:30:00	2026-09-26 21:00:00	120	AGC	2026-09-26 15:25:34.113689	2026-09-26 15:25:34.113689
27291	28139	26721	2674	PT-028139	SIGNAL_CABLE_REPLACEMENT	\N	OPEN	2026-09-26 15:30:00	2026-09-26 22:00:00	110	RKM	2026-09-26 15:25:34.113689	2026-09-26 15:25:34.113689
\.


--
-- Data for Name: smms_alert; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.smms_alert (id, asset_id, inspection_id, alert_type_code, alert_feedback_code, alert_status_code, cause_code, incidence_date_time, rectification_date_time, incidence_duration, alert_feedback_date_time, remarks, maintainer_name, maintainer_designation, maintainer_mobile) FROM stdin;
9329	2665	24429	POINT_OUT_OF_CORRESPONDENCE	\N	ACTIVE	\N	2026-09-25 17:10:00	\N	\N	\N	\N	\N	\N	\N
9330	2666	24430	SIGNAL_RED_ASPECT_EXTINCTION	\N	ACTIVE	\N	2026-09-25 17:35:00	\N	\N	\N	\N	\N	\N	\N
9331	2665	24431	MOTOR_OVERCURRENT_WARNING	\N	ACTIVE	OBSTRUCTION_OR_DRY_SLIDE_CHAIR	2026-09-25 15:45:00	\N	\N	\N	Point machine current surge to 6.8A exceeding 5.2A threshold	\N	\N	\N
9332	2666	24432	CABLE_INSULATION_DROP	\N	ACTIVE	MOISTURE_INGRESS_JUNCTION_BOX	2026-09-25 16:15:00	\N	\N	\N	Megger value dropped below 10 Mega-ohms on Home Signal tail cable	\N	\N	\N
9333	2670	\N	POINT_PEAK_CURRENT	\N	ACTIVE	\N	2026-09-26 13:00:00	\N	\N	\N	Point 101A motor operating current above threshold	\N	\N	\N
9334	2671	\N	DETECTION_CONTACT_WEAR	\N	ACTIVE	\N	2026-09-26 13:15:00	\N	\N	\N	Point 102B detection contact friction wear	\N	\N	\N
\.


--
-- Data for Name: smms_inspection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.smms_inspection (id, asset_id, inspection_date, inspection_type, parameter_code, parameter_value, remarks) FROM stdin;
24429	2665	2026-09-25 13:00:00	POINT_OBSTRUCTION_TEST	POINT_THROW_TIME_SEC	5.4	\N
24430	2666	2026-09-25 13:45:00	SIGNAL_VOLTAGE_CHECK	SIGNAL_LED_CURRENT_MA	142.0	\N
24431	2665	2026-09-25 15:30:00	DATA_LOGGER_ANALYSIS	POINT_MOTOR_CURRENT_PEAK	\N	\N
24432	2666	2026-09-25 16:00:00	SIGNAL_RELAY_ROOM_AUDIT	CIRCUIT_RESISTANCE_OHMS	\N	\N
24433	2674	2026-09-26 12:45:00	SIGNAL_CABLE_MEGGER	INSULATION_RESISTANCE	\N	Low insulation resistance in underground signalling cable
\.


--
-- Data for Name: smms_maintenance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.smms_maintenance (id, asset_id, alert_id, maintenance_type, planned_date, start_date, end_date, status, remarks) FROM stdin;
9329	2665	9329	POINT_MOTOR_OVERHAUL	2026-09-26 07:30:00	\N	\N	SCHEDULED	Disconnect circuit, replace detector slide and test correspondence with panel
9330	2666	9330	LED_UNIT_REPLACEMENT	2026-09-26 08:00:00	\N	\N	SCHEDULED	Replace red aspect LED optical unit and verify feedback relay pickup
9331	2665	9331	POINT_MACHINE_OVERHAUL	2026-09-26 11:45:00	2026-09-26 11:45:00	2026-09-26 13:15:00	SCHEDULED	Requires 90 min traffic/signalling block with ESM gang
9332	2666	9332	SIGNAL_CABLE_RENEWAL	2026-09-26 11:15:00	2026-09-26 11:15:00	2026-09-26 12:15:00	SCHEDULED	Requires 60 min signalling block with signal gang
9333	2670	\N	POINT_MACHINE_OVERHAUL	2026-09-26 16:30:00	2026-09-26 16:30:00	2026-09-26 18:30:00	PLANNED	\N
9334	2671	\N	POINT_DETECTION_OVERHAUL	2026-09-26 17:30:00	2026-09-26 17:30:00	2026-09-26 19:30:00	PLANNED	\N
9335	2674	\N	SIGNAL_CABLE_REPLACEMENT	2026-09-26 16:00:00	2026-09-26 16:00:00	2026-09-26 17:50:00	PLANNED	\N
\.


--
-- Data for Name: source_system; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.source_system (id, system_code, system_name, description) FROM stdin;
7	TMS	Track Management System	Indian Railways Track asset and defect repository
8	TDMS	Traction Distribution Management System	Indian Railways OHE and Traction Electrical repository
9	SMMS	Signalling Maintenance Management System	Indian Railways Signalling & Interlocking asset telemetry
10	COA	Control Office Application	Indian Railways Train Timetable, Movement and Section Occupancy
\.


--
-- Data for Name: task_dependency; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_dependency (id, predecessor_task_id, successor_task_id, dependency_type, lag_minutes, description, created_at) FROM stdin;
\.


--
-- Data for Name: task_resource; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_resource (id, planning_task_id, planning_resource_id, required_quantity, allocation_status, remarks, created_at) FROM stdin;
20345	27285	393	1	REQUIRED	\N	2026-09-26 15:25:34.885207
20346	27289	394	1	REQUIRED	\N	2026-09-26 15:25:34.96881
20347	27290	394	1	REQUIRED	\N	2026-09-26 15:25:35.051538
20348	27286	395	1	REQUIRED	\N	2026-09-26 15:25:35.120469
20349	27291	396	1	REQUIRED	\N	2026-09-26 15:25:35.186236
20350	27287	397	1	REQUIRED	\N	2026-09-26 15:25:35.250621
20351	27288	398	1	REQUIRED	\N	2026-09-26 15:25:35.318769
\.


--
-- Data for Name: tdms_failure; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tdms_failure (id, asset_id, inspection_id, failure_code, failure_description, severity, failure_date, status, rectification_date, remarks) FROM stdin;
9500	2663	24902	CANTILEVER_INSULATOR_FLASH	Flashover on 25kV cantilever bracket insulator Km 1343/18	HIGH	2026-09-25 15:00:00	UNRESOLVED	\N	\N
9501	2664	24903	DROPPER_SLACK_OR_DISPLACED	Excessive stagger and displaced current droppers under thermal expansion	MEDIUM	2026-09-25 15:40:00	UNRESOLVED	\N	\N
9502	2663	24904	CANTILEVER_INSULATOR_FLASH	\N	HIGH	2026-09-25 15:00:00	UNRESOLVED	\N	\N
9503	2664	24905	DROPPER_SLACK_OR_DISPLACED	\N	MEDIUM	2026-09-25 15:40:00	UNRESOLVED	\N	\N
9504	2677	24906	OHE-INSUL-01	Section insulator tracking and carbon deposition	CRITICAL	2026-09-26 12:30:00	OPEN	\N	\N
\.


--
-- Data for Name: tdms_inspection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tdms_inspection (id, asset_id, inspection_date, inspection_type, parameter_code, parameter_value, remarks) FROM stdin;
24902	2663	2026-09-25 14:30:00	CURRENT_COLLECTION_TEST	CONTACT_WIRE_WEAR	72.0	\N
24903	2664	2026-09-25 15:10:00	TOWER_WAGON_PHYSICAL	CONTACT_WIRE_STAGGER_MM	195.0	\N
24904	2663	2026-09-25 14:30:00	CURRENT_COLLECTION_TEST	CONTACT_WIRE_WEAR	\N	\N
24905	2664	2026-09-25 15:10:00	TOWER_WAGON_PHYSICAL	CONTACT_WIRE_STAGGER_MM	\N	\N
24906	2677	2026-09-26 12:00:00	OHE_FOOT_PATROL	INSULATOR_FLASH_MARK	\N	Flashover marks observed on 25kV section insulator
\.


--
-- Data for Name: tdms_maintenance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tdms_maintenance (id, asset_id, failure_id, maintenance_type, planned_date, start_date, end_date, status, remarks) FROM stdin;
9635	2663	9500	POWER_BLOCK_ISOLATION_REPAIR	2026-09-26 07:00:00	\N	\N	SCHEDULED	Requires 25kV OHE isolation and Tower Wagon TW-AGC-01
9636	2664	9501	OHE_STAGGER_ADJUSTMENT	2026-09-26 08:15:00	\N	\N	SCHEDULED	Requires 75 min OHE power block with ladder trolley or tower wagon
9637	2663	9502	POWER_BLOCK_ISOLATION_REPAIR	2026-09-26 12:00:00	2026-09-26 12:00:00	2026-09-26 13:15:00	SCHEDULED	Requires 25kV OHE isolation and Tower Wagon TW-AGC-01
9638	2664	9503	OHE_STAGGER_ADJUSTMENT	2026-09-26 11:45:00	2026-09-26 11:45:00	2026-09-26 13:15:00	SCHEDULED	Requires 90 min OHE power block with ladder trolley or tower wagon
9639	2677	9504	OHE_INSULATOR_REPLACEMENT	2026-09-26 14:30:00	2026-09-26 14:30:00	2026-09-26 16:00:00	PLANNED	\N
\.


--
-- Data for Name: tms_defect; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tms_defect (id, asset_id, inspection_id, defect_code, defect_description, severity, detected_date, status, remarks) FROM stdin;
9332	2661	24482	IMMINENT_WELD_FAILURE	IMR ultrasonic flaw detected on RH rail head Km 1342/14	CRITICAL	2026-09-25 14:00:00	OPEN	\N
9333	2662	24483	BALLAST_CUSHION_DEFICIT	Caked and fouled ballast cushion depth below 150mm near Km 1347/08	MAJOR	2026-09-25 14:45:00	OPEN	\N
9334	2661	24484	IMMINENT_WELD_FAILURE	\N	CRITICAL	\N	OPEN	\N
9335	2662	24485	BALLAST_CUSHION_DEFICIT	\N	MAJOR	\N	OPEN	\N
9336	2668	24486	RAIL-IMR-01	Rail flaw requiring cut and weld piece renewal	CRITICAL	2026-09-26 13:30:00	OPEN	\N
9337	2673	24487	ALIGN-DEV-02	Track gauge and cross level alignment deviation	MAJOR	2026-09-26 13:45:00	OPEN	\N
9338	2675	24488	BALLAST-FOUL-03	Fouled ballast requiring deep screening & packing	MAJOR	2026-09-26 13:30:00	OPEN	\N
\.


--
-- Data for Name: tms_inspection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tms_inspection (id, asset_id, inspection_date, inspection_type, parameter_code, parameter_value, remarks) FROM stdin;
24482	2661	2026-09-25 13:30:00	USFD_RAIL_TESTING	TRANSVERSE_FLAW_INDEX	8.6	\N
24483	2662	2026-09-25 14:15:00	TRACK_RECORDING_CAR	TRACK_QUALITY_INDEX_TQI	42.1	\N
24484	2661	2026-09-25 13:30:00	USFD_RAIL_TESTING	TRANSVERSE_FLAW_INDEX	\N	\N
24485	2662	2026-09-25 14:15:00	TRACK_RECORDING_CAR	TRACK_QUALITY_INDEX_TQI	\N	\N
24486	2668	2026-09-26 13:00:00	USFD_ULTRASONIC	RAIL_FLAW	\N	USFD ultrasonic flaw testing detects head defect
24487	2673	2026-09-26 13:15:00	TRACK_RECORDING	TRACK_GEOMETRY	\N	TRC coach reports alignment deviation near RKM platform
24488	2675	2026-09-26 12:30:00	BALLAST_INSPECTION	BALLAST_CUSHION	\N	Ballast fouling index high on Mathura DOWN line
\.


--
-- Data for Name: tms_maintenance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tms_maintenance (id, asset_id, defect_id, maintenance_type, planned_date, start_date, end_date, status, remarks) FROM stdin;
9332	2661	9332	RAIL_CUT_AND_REPLACE	2026-09-26 08:30:00	\N	\N	SCHEDULED	Requires 90 min traffic block with rail cutting & welding kit GANG-02
9333	2662	9333	BALLAST_DEEP_SCREENING	2026-09-26 10:00:00	\N	\N	SCHEDULED	Requires 180 min traffic block with BCM-NCR-04 and tamping machine CSM-NCR-10
9334	2661	9334	RAIL_CUT_AND_REPLACE	2026-09-26 12:00:00	2026-09-26 12:00:00	2026-09-26 13:30:00	SCHEDULED	Requires 90 min traffic block with rail cutting & welding kit GANG-02
9335	2662	9335	BALLAST_DEEP_SCREENING	2026-09-26 11:15:00	2026-09-26 11:15:00	2026-09-26 13:15:00	SCHEDULED	Requires 120 min traffic block with BCM-NCR-04 and tamping machine CSM-NCR-10
9336	2668	9336	RAIL_CUT_AND_WELD	2026-09-26 15:30:00	2026-09-26 15:30:00	2026-09-26 16:45:00	PLANNED	\N
9337	2673	9337	TRACK_TAMPING_AND_LINING	2026-09-26 15:30:00	2026-09-26 15:30:00	2026-09-26 17:10:00	PLANNED	\N
9338	2675	9338	BALLAST_DEEP_SCREENING	2026-09-26 16:30:00	2026-09-26 16:30:00	2026-09-26 18:30:00	PLANNED	\N
\.


--
-- Data for Name: train; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.train (id, train_id, train_number, train_name, schedule_date, start_date, loco_number, direction, source_system_id, created_at, updated_at) FROM stdin;
2522	12002-NDLS-BPL	12002	Bhopal Shatabdi Express	2026-09-25 05:30:00	2026-09-25 11:30:00	\N	UP	10	2026-09-26 15:22:55.721799	\N
2523	12952-NDLS-MMCT	12952	Mumbai Tejas Rajdhani Express	2026-09-25 05:30:00	2026-09-25 11:30:00	\N	UP	10	2026-09-26 15:22:56.314229	\N
2524	12616-NDLS-MAS	12616	Grand Trunk Express	2026-09-25 05:30:00	2026-09-25 11:30:00	\N	UP	10	2026-09-26 15:22:56.517435	\N
2525	BOXN-TKD-BZA-01	BOXN-01	Tuglakabad-Vijayawada Coal Rake	2026-09-25 05:30:00	2026-09-25 11:30:00	\N	UP	10	2026-09-26 15:22:56.722855	\N
2526	12049-NZM-AGC	12049	Gatimaan Superfast Express	2026-09-26 05:30:00	2026-09-26 13:40:00	WAP5-30005	DOWN	10	2026-09-26 15:23:49.683836	\N
2527	12050-AGC-NZM	12050	Gatimaan Return Express	2026-09-26 05:30:00	2026-09-26 20:00:00	WAP5-30005	UP	10	2026-09-26 15:23:49.773078	\N
2528	12001-BPL-NDLS	12001	Bhopal Shatabdi Return	2026-09-26 05:30:00	2026-09-26 20:30:00	WAP7-30214	DOWN	10	2026-09-26 15:23:49.858145	\N
2529	12615-MAS-NDLS	12615	Grand Trunk Return	2026-09-26 05:30:00	2026-09-26 12:30:00	WAP7-30452	UP	10	2026-09-26 15:23:49.96869	\N
2530	12280-NDLS-VGLB	12280	Taj Express	2026-09-26 05:30:00	2026-09-26 12:25:00	WAP7-30333	DOWN	10	2026-09-26 15:23:50.078961	\N
2531	BCN-TKD-02	BCN-02	Covered Wagon Freight Rake	2026-09-26 05:30:00	2026-09-26 10:30:00	WAG9-31550	UP	10	2026-09-26 15:23:50.198542	\N
2532	BOXN-TKD-BZA	BOXN-01	Coal Freight Rake (Heavy Haul)	2026-09-26 05:30:00	2026-09-26 11:30:00	WAP7-30214	DOWN	10	2026-09-26 15:25:28.704223	\N
\.


--
-- Data for Name: train_movement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.train_movement (id, train_id, station_code, movement_flag, movement_datetime, line_number, source_event_id, remarks) FROM stdin;
14218	2523	AGC	D	2026-09-25 13:46:10	UP-MAIN	\N	\N
14220	2522	RKM	D	2026-09-26 11:00:00	UP-MAIN	\N	Passed Raja Ki Mandi on time
14222	2524	FAR	T	2026-09-26 11:00:00	DOWN-MAIN	\N	Run through Farah Town
14226	2526	AGC	A	2026-09-26 10:55:00	UP-MAIN	\N	Arrived Agra Cantt PF-1
14229	2530	RKM	A	2026-09-26 10:15:00	DOWN-MAIN	\N	Arrived Raja Ki Mandi
14217	2522	AGC	D	2026-09-25 13:21:30	UP-MAIN	\N	\N
14219	2526	AGC	A	2026-09-26 11:00:00	UP-MAIN	\N	Arrived Agra Cantt PF-1 on time
14221	2523	MTJ	A	2026-09-26 11:00:00	DOWN-MAIN	\N	Arrived Mathura Jn PF-2 on time
14223	2530	RKM	A	2026-09-26 10:45:00	DOWN-MAIN	\N	Arrived Raja Ki Mandi
14224	2525	BHA	A	2026-09-26 10:00:00	3RD-LINE	\N	Held on Bhandai loop line for precedence
14225	2522	RKM	D	2026-09-26 10:55:00	UP-MAIN	\N	Passed Raja Ki Mandi on time
14227	2523	MTJ	A	2026-09-26 10:55:00	DOWN-MAIN	\N	Arrived Mathura Jn PF-2
14228	2524	FAR	T	2026-09-26 10:55:00	DOWN-MAIN	\N	Run through Farah
14230	2525	BHA	A	2026-09-26 10:00:00	3RD-LINE	\N	Held at Bhandai loop line for precedence
\.


--
-- Data for Name: train_schedule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.train_schedule (id, train_id, station_code, scheduled_arrival, scheduled_departure, scheduled_run_through, sequence_number, line_number, source_schedule_id, remarks) FROM stdin;
1015	2522	AGC	2026-09-25 13:15:00	2026-09-25 13:20:00	\N	3	1	\N	\N
1016	2523	AGC	2026-09-25 13:40:00	2026-09-25 13:45:00	\N	2	2	\N	\N
1017	2526	MTJ	2026-09-26 10:00:00	2026-09-26 10:00:00	\N	1	DOWN-MAIN	\N	\N
1018	2526	RKM	2026-09-26 10:15:00	2026-09-26 10:15:00	\N	2	DOWN-MAIN	\N	\N
1019	2526	AGC	2026-09-26 10:55:00	2026-09-26 12:00:00	\N	3	UP-MAIN	\N	\N
1020	2523	MTJ	2026-09-26 10:55:00	2026-09-26 11:05:00	\N	1	DOWN-MAIN	\N	\N
1021	2523	FAR	2026-09-26 11:15:00	2026-09-26 11:15:00	\N	2	DOWN-MAIN	\N	\N
1022	2523	AGC	2026-09-26 11:30:00	2026-09-26 11:30:00	\N	3	DOWN-MAIN	\N	\N
1023	2522	BHA	2026-09-26 10:00:00	2026-09-26 10:00:00	\N	1	UP-MAIN	\N	\N
1024	2522	AGC	2026-09-26 10:15:00	2026-09-26 10:15:00	\N	2	UP-MAIN	\N	\N
1025	2522	RKM	2026-09-26 10:55:00	2026-09-26 10:55:00	\N	3	UP-MAIN	\N	\N
1026	2522	MTJ	2026-09-26 11:30:00	2026-09-26 11:30:00	\N	4	UP-MAIN	\N	\N
\.


--
-- Name: asset_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asset_master_id_seq', 2678, true);


--
-- Name: asset_parameter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.asset_parameter_id_seq', 938, true);


--
-- Name: available_window_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.available_window_id_seq', 2064, true);


--
-- Name: block_plan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.block_plan_id_seq', 94, true);


--
-- Name: block_plan_task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.block_plan_task_id_seq', 91, true);


--
-- Name: block_requirement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.block_requirement_id_seq', 26723, true);


--
-- Name: candidate_block_window_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidate_block_window_id_seq', 254620, true);


--
-- Name: controller_decision_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.controller_decision_id_seq', 11, true);


--
-- Name: defect_failure_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.defect_failure_id_seq', 28007, true);


--
-- Name: execution_outcome_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.execution_outcome_id_seq', 1, true);


--
-- Name: line_occupancy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.line_occupancy_id_seq', 3124, true);


--
-- Name: location_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.location_master_id_seq', 443, true);


--
-- Name: maintenance_requirement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.maintenance_requirement_id_seq', 28139, true);


--
-- Name: operational_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operational_event_id_seq', 7100, true);


--
-- Name: optimization_input_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.optimization_input_id_seq', 2547, true);


--
-- Name: optimization_output_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.optimization_output_id_seq', 1, false);


--
-- Name: optimization_run_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.optimization_run_id_seq', 14, true);


--
-- Name: plan_validation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.plan_validation_id_seq', 379, true);


--
-- Name: planning_constraint_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.planning_constraint_id_seq', 64087, true);


--
-- Name: planning_priority_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.planning_priority_id_seq', 236, true);


--
-- Name: planning_resource_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.planning_resource_id_seq', 398, true);


--
-- Name: planning_task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.planning_task_id_seq', 27291, true);


--
-- Name: smms_alert_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.smms_alert_id_seq', 9334, true);


--
-- Name: smms_inspection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.smms_inspection_id_seq', 24433, true);


--
-- Name: smms_maintenance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.smms_maintenance_id_seq', 9335, true);


--
-- Name: source_system_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.source_system_id_seq', 10, true);


--
-- Name: task_dependency_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.task_dependency_id_seq', 2078, true);


--
-- Name: task_resource_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.task_resource_id_seq', 20351, true);


--
-- Name: tdms_failure_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tdms_failure_id_seq', 9504, true);


--
-- Name: tdms_inspection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tdms_inspection_id_seq', 24906, true);


--
-- Name: tdms_maintenance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tdms_maintenance_id_seq', 9639, true);


--
-- Name: tms_defect_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tms_defect_id_seq', 9338, true);


--
-- Name: tms_inspection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tms_inspection_id_seq', 24488, true);


--
-- Name: tms_maintenance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tms_maintenance_id_seq', 9338, true);


--
-- Name: train_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.train_id_seq', 2532, true);


--
-- Name: train_movement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.train_movement_id_seq', 14230, true);


--
-- Name: train_schedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.train_schedule_id_seq', 1026, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: asset_master asset_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master
    ADD CONSTRAINT asset_master_pkey PRIMARY KEY (id);


--
-- Name: asset_parameter asset_parameter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_parameter
    ADD CONSTRAINT asset_parameter_pkey PRIMARY KEY (id);


--
-- Name: available_window available_window_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.available_window
    ADD CONSTRAINT available_window_pkey PRIMARY KEY (id);


--
-- Name: block_plan block_plan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan
    ADD CONSTRAINT block_plan_pkey PRIMARY KEY (id);


--
-- Name: block_plan_task block_plan_task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan_task
    ADD CONSTRAINT block_plan_task_pkey PRIMARY KEY (id);


--
-- Name: block_requirement block_requirement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_requirement
    ADD CONSTRAINT block_requirement_pkey PRIMARY KEY (id);


--
-- Name: candidate_block_window candidate_block_window_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_block_window
    ADD CONSTRAINT candidate_block_window_pkey PRIMARY KEY (id);


--
-- Name: controller_decision controller_decision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controller_decision
    ADD CONSTRAINT controller_decision_pkey PRIMARY KEY (id);


--
-- Name: defect_failure defect_failure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defect_failure
    ADD CONSTRAINT defect_failure_pkey PRIMARY KEY (id);


--
-- Name: execution_outcome execution_outcome_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_outcome
    ADD CONSTRAINT execution_outcome_pkey PRIMARY KEY (id);


--
-- Name: line_occupancy line_occupancy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_occupancy
    ADD CONSTRAINT line_occupancy_pkey PRIMARY KEY (id);


--
-- Name: location_master location_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_master
    ADD CONSTRAINT location_master_pkey PRIMARY KEY (id);


--
-- Name: maintenance_requirement maintenance_requirement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requirement
    ADD CONSTRAINT maintenance_requirement_pkey PRIMARY KEY (id);


--
-- Name: operational_event operational_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_event
    ADD CONSTRAINT operational_event_pkey PRIMARY KEY (id);


--
-- Name: optimization_input optimization_input_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_input
    ADD CONSTRAINT optimization_input_pkey PRIMARY KEY (id);


--
-- Name: optimization_output optimization_output_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_output
    ADD CONSTRAINT optimization_output_pkey PRIMARY KEY (id);


--
-- Name: optimization_run optimization_run_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_run
    ADD CONSTRAINT optimization_run_pkey PRIMARY KEY (id);


--
-- Name: plan_validation plan_validation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_validation
    ADD CONSTRAINT plan_validation_pkey PRIMARY KEY (id);


--
-- Name: planning_constraint planning_constraint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_constraint
    ADD CONSTRAINT planning_constraint_pkey PRIMARY KEY (id);


--
-- Name: planning_priority planning_priority_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_priority
    ADD CONSTRAINT planning_priority_pkey PRIMARY KEY (id);


--
-- Name: planning_resource planning_resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_resource
    ADD CONSTRAINT planning_resource_pkey PRIMARY KEY (id);


--
-- Name: planning_task planning_task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_task
    ADD CONSTRAINT planning_task_pkey PRIMARY KEY (id);


--
-- Name: smms_alert smms_alert_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_alert
    ADD CONSTRAINT smms_alert_pkey PRIMARY KEY (id);


--
-- Name: smms_inspection smms_inspection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_inspection
    ADD CONSTRAINT smms_inspection_pkey PRIMARY KEY (id);


--
-- Name: smms_maintenance smms_maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_maintenance
    ADD CONSTRAINT smms_maintenance_pkey PRIMARY KEY (id);


--
-- Name: source_system source_system_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_system
    ADD CONSTRAINT source_system_pkey PRIMARY KEY (id);


--
-- Name: task_dependency task_dependency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependency
    ADD CONSTRAINT task_dependency_pkey PRIMARY KEY (id);


--
-- Name: task_resource task_resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_resource
    ADD CONSTRAINT task_resource_pkey PRIMARY KEY (id);


--
-- Name: tdms_failure tdms_failure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_failure
    ADD CONSTRAINT tdms_failure_pkey PRIMARY KEY (id);


--
-- Name: tdms_inspection tdms_inspection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_inspection
    ADD CONSTRAINT tdms_inspection_pkey PRIMARY KEY (id);


--
-- Name: tdms_maintenance tdms_maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_maintenance
    ADD CONSTRAINT tdms_maintenance_pkey PRIMARY KEY (id);


--
-- Name: tms_defect tms_defect_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_defect
    ADD CONSTRAINT tms_defect_pkey PRIMARY KEY (id);


--
-- Name: tms_inspection tms_inspection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_inspection
    ADD CONSTRAINT tms_inspection_pkey PRIMARY KEY (id);


--
-- Name: tms_maintenance tms_maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_maintenance
    ADD CONSTRAINT tms_maintenance_pkey PRIMARY KEY (id);


--
-- Name: train_movement train_movement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train_movement
    ADD CONSTRAINT train_movement_pkey PRIMARY KEY (id);


--
-- Name: train train_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train
    ADD CONSTRAINT train_pkey PRIMARY KEY (id);


--
-- Name: train_schedule train_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train_schedule
    ADD CONSTRAINT train_schedule_pkey PRIMARY KEY (id);


--
-- Name: asset_master uq_asset_master_source_system_asset; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master
    ADD CONSTRAINT uq_asset_master_source_system_asset UNIQUE (source_system_id, source_asset_id);


--
-- Name: block_plan uq_block_plan_plan_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan
    ADD CONSTRAINT uq_block_plan_plan_code UNIQUE (plan_code);


--
-- Name: block_plan_task uq_block_plan_task_plan_task; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan_task
    ADD CONSTRAINT uq_block_plan_task_plan_task UNIQUE (block_plan_id, planning_task_id);


--
-- Name: candidate_block_window uq_candidate_block_window_task_window; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_block_window
    ADD CONSTRAINT uq_candidate_block_window_task_window UNIQUE (planning_task_id, available_window_id);


--
-- Name: defect_failure uq_defect_failure_source; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defect_failure
    ADD CONSTRAINT uq_defect_failure_source UNIQUE (source_system_id, source_record_type, source_record_id);


--
-- Name: maintenance_requirement uq_maintenance_requirement_source; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requirement
    ADD CONSTRAINT uq_maintenance_requirement_source UNIQUE (source_system_id, source_record_type, source_record_id);


--
-- Name: optimization_run uq_optimization_run_run_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_run
    ADD CONSTRAINT uq_optimization_run_run_code UNIQUE (run_code);


--
-- Name: planning_priority uq_planning_priority_planning_task; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_priority
    ADD CONSTRAINT uq_planning_priority_planning_task UNIQUE (planning_task_id);


--
-- Name: planning_task uq_planning_task_maintenance_requirement; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_task
    ADD CONSTRAINT uq_planning_task_maintenance_requirement UNIQUE (maintenance_requirement_id);


--
-- Name: source_system uq_source_system_system_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_system
    ADD CONSTRAINT uq_source_system_system_code UNIQUE (system_code);


--
-- Name: task_dependency uq_task_dependency_predecessor_successor_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependency
    ADD CONSTRAINT uq_task_dependency_predecessor_successor_type UNIQUE (predecessor_task_id, successor_task_id, dependency_type);


--
-- Name: task_resource uq_task_resource_planning_task_resource; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_resource
    ADD CONSTRAINT uq_task_resource_planning_task_resource UNIQUE (planning_task_id, planning_resource_id);


--
-- Name: train uq_train_source_system_train_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train
    ADD CONSTRAINT uq_train_source_system_train_id UNIQUE (source_system_id, train_id);


--
-- Name: ix_asset_master_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asset_master_location_id ON public.asset_master USING btree (location_id);


--
-- Name: ix_asset_master_source_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asset_master_source_asset_id ON public.asset_master USING btree (source_asset_id);


--
-- Name: ix_asset_master_source_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asset_master_source_system_id ON public.asset_master USING btree (source_system_id);


--
-- Name: ix_asset_parameter_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asset_parameter_asset_id ON public.asset_parameter USING btree (asset_id);


--
-- Name: ix_asset_parameter_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asset_parameter_code ON public.asset_parameter USING btree (parameter_code);


--
-- Name: ix_asset_parameter_source_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asset_parameter_source_system_id ON public.asset_parameter USING btree (source_system_id);


--
-- Name: ix_available_window_line_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_available_window_line_number ON public.available_window USING btree (line_number);


--
-- Name: ix_available_window_sc_line_start_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_available_window_sc_line_start_end ON public.available_window USING btree (station_code, line_number, window_start, window_end);


--
-- Name: ix_available_window_station_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_available_window_station_code ON public.available_window USING btree (station_code);


--
-- Name: ix_available_window_window_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_available_window_window_end ON public.available_window USING btree (window_end);


--
-- Name: ix_available_window_window_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_available_window_window_start ON public.available_window USING btree (window_start);


--
-- Name: ix_available_window_window_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_available_window_window_status ON public.available_window USING btree (window_status);


--
-- Name: ix_block_plan_optimization_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_optimization_run_id ON public.block_plan USING btree (optimization_run_id);


--
-- Name: ix_block_plan_plan_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_plan_date ON public.block_plan USING btree (plan_date);


--
-- Name: ix_block_plan_revises_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_revises_plan_id ON public.block_plan USING btree (revises_plan_id);


--
-- Name: ix_block_plan_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_status ON public.block_plan USING btree (status);


--
-- Name: ix_block_plan_task_block_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_task_block_plan_id ON public.block_plan_task USING btree (block_plan_id);


--
-- Name: ix_block_plan_task_candidate_block_window_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_task_candidate_block_window_id ON public.block_plan_task USING btree (candidate_block_window_id);


--
-- Name: ix_block_plan_task_planned_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_task_planned_end ON public.block_plan_task USING btree (planned_end);


--
-- Name: ix_block_plan_task_planned_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_task_planned_start ON public.block_plan_task USING btree (planned_start);


--
-- Name: ix_block_plan_task_planning_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_task_planning_task_id ON public.block_plan_task USING btree (planning_task_id);


--
-- Name: ix_block_plan_task_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_plan_task_status ON public.block_plan_task USING btree (status);


--
-- Name: ix_block_requirement_earliest_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_requirement_earliest_start ON public.block_requirement USING btree (earliest_start);


--
-- Name: ix_block_requirement_latest_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_requirement_latest_end ON public.block_requirement USING btree (latest_end);


--
-- Name: ix_block_requirement_line_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_requirement_line_number ON public.block_requirement USING btree (line_number);


--
-- Name: ix_block_requirement_maintenance_requirement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_requirement_maintenance_requirement_id ON public.block_requirement USING btree (maintenance_requirement_id);


--
-- Name: ix_block_requirement_station_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_requirement_station_code ON public.block_requirement USING btree (station_code);


--
-- Name: ix_block_requirement_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_requirement_status ON public.block_requirement USING btree (status);


--
-- Name: ix_candidate_block_window_available_window_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_candidate_block_window_available_window_id ON public.candidate_block_window USING btree (available_window_id);


--
-- Name: ix_candidate_block_window_block_requirement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_candidate_block_window_block_requirement_id ON public.candidate_block_window USING btree (block_requirement_id);


--
-- Name: ix_candidate_block_window_feasibility_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_candidate_block_window_feasibility_status ON public.candidate_block_window USING btree (feasibility_status);


--
-- Name: ix_candidate_block_window_feasible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_candidate_block_window_feasible ON public.candidate_block_window USING btree (feasible);


--
-- Name: ix_candidate_block_window_planning_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_candidate_block_window_planning_task_id ON public.candidate_block_window USING btree (planning_task_id);


--
-- Name: ix_controller_decision_block_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_controller_decision_block_plan_id ON public.controller_decision USING btree (block_plan_id);


--
-- Name: ix_controller_decision_decided_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_controller_decision_decided_at ON public.controller_decision USING btree (decided_at);


--
-- Name: ix_controller_decision_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_controller_decision_decision ON public.controller_decision USING btree (decision);


--
-- Name: ix_defect_failure_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_defect_failure_asset_id ON public.defect_failure USING btree (asset_id);


--
-- Name: ix_defect_failure_detected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_defect_failure_detected_at ON public.defect_failure USING btree (detected_at);


--
-- Name: ix_defect_failure_source_record_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_defect_failure_source_record_type ON public.defect_failure USING btree (source_record_type);


--
-- Name: ix_defect_failure_source_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_defect_failure_source_system_id ON public.defect_failure USING btree (source_system_id);


--
-- Name: ix_defect_failure_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_defect_failure_status ON public.defect_failure USING btree (status);


--
-- Name: ix_execution_outcome_actual_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_execution_outcome_actual_end ON public.execution_outcome USING btree (actual_end);


--
-- Name: ix_execution_outcome_actual_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_execution_outcome_actual_start ON public.execution_outcome USING btree (actual_start);


--
-- Name: ix_execution_outcome_block_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_execution_outcome_block_plan_id ON public.execution_outcome USING btree (block_plan_id);


--
-- Name: ix_execution_outcome_block_plan_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_execution_outcome_block_plan_task_id ON public.execution_outcome USING btree (block_plan_task_id);


--
-- Name: ix_execution_outcome_execution_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_execution_outcome_execution_status ON public.execution_outcome USING btree (execution_status);


--
-- Name: ix_line_occupancy_line_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_line_occupancy_line_number ON public.line_occupancy USING btree (line_number);


--
-- Name: ix_line_occupancy_occupancy_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_line_occupancy_occupancy_start ON public.line_occupancy USING btree (occupancy_start);


--
-- Name: ix_line_occupancy_station_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_line_occupancy_station_code ON public.line_occupancy USING btree (station_code);


--
-- Name: ix_line_occupancy_train_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_line_occupancy_train_id ON public.line_occupancy USING btree (train_id);


--
-- Name: ix_maintenance_requirement_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_maintenance_requirement_asset_id ON public.maintenance_requirement USING btree (asset_id);


--
-- Name: ix_maintenance_requirement_defect_failure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_maintenance_requirement_defect_failure_id ON public.maintenance_requirement USING btree (defect_failure_id);


--
-- Name: ix_maintenance_requirement_planned_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_maintenance_requirement_planned_date ON public.maintenance_requirement USING btree (planned_date);


--
-- Name: ix_maintenance_requirement_source_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_maintenance_requirement_source_system_id ON public.maintenance_requirement USING btree (source_system_id);


--
-- Name: ix_maintenance_requirement_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_maintenance_requirement_status ON public.maintenance_requirement USING btree (status);


--
-- Name: ix_operational_event_event_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_operational_event_event_datetime ON public.operational_event USING btree (event_datetime);


--
-- Name: ix_operational_event_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_operational_event_event_type ON public.operational_event USING btree (event_type);


--
-- Name: ix_operational_event_station_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_operational_event_station_code ON public.operational_event USING btree (station_code);


--
-- Name: ix_operational_event_train_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_operational_event_train_id ON public.operational_event USING btree (train_id);


--
-- Name: ix_optimization_input_candidate_block_window_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_input_candidate_block_window_id ON public.optimization_input USING btree (candidate_block_window_id);


--
-- Name: ix_optimization_input_input_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_input_input_role ON public.optimization_input USING btree (input_role);


--
-- Name: ix_optimization_input_optimization_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_input_optimization_run_id ON public.optimization_input USING btree (optimization_run_id);


--
-- Name: ix_optimization_input_planning_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_input_planning_task_id ON public.optimization_input USING btree (planning_task_id);


--
-- Name: ix_optimization_output_candidate_block_window_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_output_candidate_block_window_id ON public.optimization_output USING btree (candidate_block_window_id);


--
-- Name: ix_optimization_output_optimization_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_output_optimization_run_id ON public.optimization_output USING btree (optimization_run_id);


--
-- Name: ix_optimization_output_output_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_output_output_type ON public.optimization_output USING btree (output_type);


--
-- Name: ix_optimization_output_planning_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_output_planning_task_id ON public.optimization_output USING btree (planning_task_id);


--
-- Name: ix_optimization_output_selected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_output_selected ON public.optimization_output USING btree (selected);


--
-- Name: ix_optimization_run_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_run_requested_at ON public.optimization_run USING btree (requested_at);


--
-- Name: ix_optimization_run_run_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_run_run_type ON public.optimization_run USING btree (run_type);


--
-- Name: ix_optimization_run_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_optimization_run_status ON public.optimization_run USING btree (status);


--
-- Name: ix_plan_validation_block_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_plan_validation_block_plan_id ON public.plan_validation USING btree (block_plan_id);


--
-- Name: ix_plan_validation_validation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_plan_validation_validation_status ON public.plan_validation USING btree (validation_status);


--
-- Name: ix_plan_validation_validation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_plan_validation_validation_type ON public.plan_validation USING btree (validation_type);


--
-- Name: ix_planning_constraint_constraint_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_constraint_constraint_type ON public.planning_constraint USING btree (constraint_type);


--
-- Name: ix_planning_constraint_effective_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_constraint_effective_end ON public.planning_constraint USING btree (effective_end);


--
-- Name: ix_planning_constraint_effective_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_constraint_effective_start ON public.planning_constraint USING btree (effective_start);


--
-- Name: ix_planning_constraint_hard_constraint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_constraint_hard_constraint ON public.planning_constraint USING btree (hard_constraint);


--
-- Name: ix_planning_constraint_planning_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_constraint_planning_task_id ON public.planning_constraint USING btree (planning_task_id);


--
-- Name: ix_planning_priority_criticality_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_priority_criticality_level ON public.planning_priority USING btree (criticality_level);


--
-- Name: ix_planning_priority_planning_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_priority_planning_task_id ON public.planning_priority USING btree (planning_task_id);


--
-- Name: ix_planning_priority_priority_band; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_priority_priority_band ON public.planning_priority USING btree (priority_band);


--
-- Name: ix_planning_priority_priority_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_priority_priority_score ON public.planning_priority USING btree (priority_score);


--
-- Name: ix_planning_resource_location_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_resource_location_code ON public.planning_resource USING btree (location_code);


--
-- Name: ix_planning_resource_resource_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_planning_resource_resource_code ON public.planning_resource USING btree (resource_code);


--
-- Name: ix_planning_resource_resource_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_resource_resource_type ON public.planning_resource USING btree (resource_type);


--
-- Name: ix_planning_resource_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_resource_status ON public.planning_resource USING btree (status);


--
-- Name: ix_planning_task_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_task_asset_id ON public.planning_task USING btree (asset_id);


--
-- Name: ix_planning_task_block_requirement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_task_block_requirement_id ON public.planning_task USING btree (block_requirement_id);


--
-- Name: ix_planning_task_earliest_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_task_earliest_start ON public.planning_task USING btree (earliest_start);


--
-- Name: ix_planning_task_latest_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_task_latest_end ON public.planning_task USING btree (latest_end);


--
-- Name: ix_planning_task_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_task_status ON public.planning_task USING btree (status);


--
-- Name: ix_planning_task_task_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_planning_task_task_code ON public.planning_task USING btree (task_code);


--
-- Name: ix_smms_alert_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smms_alert_asset_id ON public.smms_alert USING btree (asset_id);


--
-- Name: ix_smms_alert_incidence_date_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smms_alert_incidence_date_time ON public.smms_alert USING btree (incidence_date_time);


--
-- Name: ix_smms_alert_inspection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smms_alert_inspection_id ON public.smms_alert USING btree (inspection_id);


--
-- Name: ix_smms_inspection_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smms_inspection_asset_id ON public.smms_inspection USING btree (asset_id);


--
-- Name: ix_smms_inspection_asset_inspection_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smms_inspection_asset_inspection_date ON public.smms_inspection USING btree (asset_id, inspection_date);


--
-- Name: ix_smms_inspection_inspection_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smms_inspection_inspection_date ON public.smms_inspection USING btree (inspection_date);


--
-- Name: ix_smms_maintenance_alert_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smms_maintenance_alert_id ON public.smms_maintenance USING btree (alert_id);


--
-- Name: ix_smms_maintenance_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smms_maintenance_asset_id ON public.smms_maintenance USING btree (asset_id);


--
-- Name: ix_smms_maintenance_planned_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smms_maintenance_planned_date ON public.smms_maintenance USING btree (planned_date);


--
-- Name: ix_source_system_system_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_source_system_system_code ON public.source_system USING btree (system_code);


--
-- Name: ix_task_dependency_dependency_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_dependency_dependency_type ON public.task_dependency USING btree (dependency_type);


--
-- Name: ix_task_dependency_predecessor_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_dependency_predecessor_task_id ON public.task_dependency USING btree (predecessor_task_id);


--
-- Name: ix_task_dependency_successor_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_dependency_successor_task_id ON public.task_dependency USING btree (successor_task_id);


--
-- Name: ix_task_resource_planning_resource_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_resource_planning_resource_id ON public.task_resource USING btree (planning_resource_id);


--
-- Name: ix_task_resource_planning_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_resource_planning_task_id ON public.task_resource USING btree (planning_task_id);


--
-- Name: ix_tdms_failure_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tdms_failure_asset_id ON public.tdms_failure USING btree (asset_id);


--
-- Name: ix_tdms_failure_failure_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tdms_failure_failure_date ON public.tdms_failure USING btree (failure_date);


--
-- Name: ix_tdms_failure_inspection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tdms_failure_inspection_id ON public.tdms_failure USING btree (inspection_id);


--
-- Name: ix_tdms_inspection_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tdms_inspection_asset_id ON public.tdms_inspection USING btree (asset_id);


--
-- Name: ix_tdms_inspection_asset_inspection_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tdms_inspection_asset_inspection_date ON public.tdms_inspection USING btree (asset_id, inspection_date);


--
-- Name: ix_tdms_inspection_inspection_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tdms_inspection_inspection_date ON public.tdms_inspection USING btree (inspection_date);


--
-- Name: ix_tdms_maintenance_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tdms_maintenance_asset_id ON public.tdms_maintenance USING btree (asset_id);


--
-- Name: ix_tdms_maintenance_failure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tdms_maintenance_failure_id ON public.tdms_maintenance USING btree (failure_id);


--
-- Name: ix_tdms_maintenance_planned_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tdms_maintenance_planned_date ON public.tdms_maintenance USING btree (planned_date);


--
-- Name: ix_tms_defect_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tms_defect_asset_id ON public.tms_defect USING btree (asset_id);


--
-- Name: ix_tms_defect_inspection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tms_defect_inspection_id ON public.tms_defect USING btree (inspection_id);


--
-- Name: ix_tms_inspection_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tms_inspection_asset_id ON public.tms_inspection USING btree (asset_id);


--
-- Name: ix_tms_inspection_inspection_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tms_inspection_inspection_date ON public.tms_inspection USING btree (inspection_date);


--
-- Name: ix_tms_maintenance_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tms_maintenance_asset_id ON public.tms_maintenance USING btree (asset_id);


--
-- Name: ix_tms_maintenance_defect_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tms_maintenance_defect_id ON public.tms_maintenance USING btree (defect_id);


--
-- Name: ix_train_movement_movement_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_train_movement_movement_datetime ON public.train_movement USING btree (movement_datetime);


--
-- Name: ix_train_movement_station_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_train_movement_station_code ON public.train_movement USING btree (station_code);


--
-- Name: ix_train_movement_train_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_train_movement_train_id ON public.train_movement USING btree (train_id);


--
-- Name: ix_train_schedule_sequence_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_train_schedule_sequence_number ON public.train_schedule USING btree (sequence_number);


--
-- Name: ix_train_schedule_station_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_train_schedule_station_code ON public.train_schedule USING btree (station_code);


--
-- Name: ix_train_schedule_train_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_train_schedule_train_id ON public.train_schedule USING btree (train_id);


--
-- Name: ix_train_source_system_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_train_source_system_id ON public.train USING btree (source_system_id);


--
-- Name: ix_train_train_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_train_train_id ON public.train USING btree (train_id);


--
-- Name: asset_master fk_asset_master_location_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master
    ADD CONSTRAINT fk_asset_master_location_id FOREIGN KEY (location_id) REFERENCES public.location_master(id) ON DELETE SET NULL;


--
-- Name: asset_master fk_asset_master_source_system_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master
    ADD CONSTRAINT fk_asset_master_source_system_id FOREIGN KEY (source_system_id) REFERENCES public.source_system(id) ON DELETE RESTRICT;


--
-- Name: asset_parameter fk_asset_parameter_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_parameter
    ADD CONSTRAINT fk_asset_parameter_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE CASCADE;


--
-- Name: asset_parameter fk_asset_parameter_source_system_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_parameter
    ADD CONSTRAINT fk_asset_parameter_source_system_id FOREIGN KEY (source_system_id) REFERENCES public.source_system(id) ON DELETE RESTRICT;


--
-- Name: available_window fk_available_window_source_occupancy_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.available_window
    ADD CONSTRAINT fk_available_window_source_occupancy_id FOREIGN KEY (source_occupancy_id) REFERENCES public.line_occupancy(id) ON DELETE RESTRICT;


--
-- Name: available_window fk_available_window_source_schedule_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.available_window
    ADD CONSTRAINT fk_available_window_source_schedule_id FOREIGN KEY (source_schedule_id) REFERENCES public.train_schedule(id) ON DELETE RESTRICT;


--
-- Name: block_plan fk_block_plan_optimization_run_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan
    ADD CONSTRAINT fk_block_plan_optimization_run_id FOREIGN KEY (optimization_run_id) REFERENCES public.optimization_run(id) ON DELETE RESTRICT;


--
-- Name: block_plan fk_block_plan_revises_plan_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan
    ADD CONSTRAINT fk_block_plan_revises_plan_id FOREIGN KEY (revises_plan_id) REFERENCES public.block_plan(id) ON DELETE RESTRICT;


--
-- Name: block_plan_task fk_block_plan_task_block_plan_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan_task
    ADD CONSTRAINT fk_block_plan_task_block_plan_id FOREIGN KEY (block_plan_id) REFERENCES public.block_plan(id) ON DELETE RESTRICT;


--
-- Name: block_plan_task fk_block_plan_task_candidate_block_window_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan_task
    ADD CONSTRAINT fk_block_plan_task_candidate_block_window_id FOREIGN KEY (candidate_block_window_id) REFERENCES public.candidate_block_window(id) ON DELETE RESTRICT;


--
-- Name: block_plan_task fk_block_plan_task_planning_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_plan_task
    ADD CONSTRAINT fk_block_plan_task_planning_task_id FOREIGN KEY (planning_task_id) REFERENCES public.planning_task(id) ON DELETE RESTRICT;


--
-- Name: block_requirement fk_block_requirement_maintenance_requirement_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_requirement
    ADD CONSTRAINT fk_block_requirement_maintenance_requirement_id FOREIGN KEY (maintenance_requirement_id) REFERENCES public.maintenance_requirement(id) ON DELETE RESTRICT;


--
-- Name: candidate_block_window fk_candidate_block_window_available_window_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_block_window
    ADD CONSTRAINT fk_candidate_block_window_available_window_id FOREIGN KEY (available_window_id) REFERENCES public.available_window(id) ON DELETE RESTRICT;


--
-- Name: candidate_block_window fk_candidate_block_window_block_requirement_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_block_window
    ADD CONSTRAINT fk_candidate_block_window_block_requirement_id FOREIGN KEY (block_requirement_id) REFERENCES public.block_requirement(id) ON DELETE RESTRICT;


--
-- Name: candidate_block_window fk_candidate_block_window_planning_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_block_window
    ADD CONSTRAINT fk_candidate_block_window_planning_task_id FOREIGN KEY (planning_task_id) REFERENCES public.planning_task(id) ON DELETE RESTRICT;


--
-- Name: controller_decision fk_controller_decision_block_plan_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.controller_decision
    ADD CONSTRAINT fk_controller_decision_block_plan_id FOREIGN KEY (block_plan_id) REFERENCES public.block_plan(id) ON DELETE RESTRICT;


--
-- Name: defect_failure fk_defect_failure_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defect_failure
    ADD CONSTRAINT fk_defect_failure_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: defect_failure fk_defect_failure_source_system_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defect_failure
    ADD CONSTRAINT fk_defect_failure_source_system_id FOREIGN KEY (source_system_id) REFERENCES public.source_system(id) ON DELETE RESTRICT;


--
-- Name: execution_outcome fk_execution_outcome_block_plan_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_outcome
    ADD CONSTRAINT fk_execution_outcome_block_plan_id FOREIGN KEY (block_plan_id) REFERENCES public.block_plan(id) ON DELETE RESTRICT;


--
-- Name: execution_outcome fk_execution_outcome_block_plan_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.execution_outcome
    ADD CONSTRAINT fk_execution_outcome_block_plan_task_id FOREIGN KEY (block_plan_task_id) REFERENCES public.block_plan_task(id) ON DELETE RESTRICT;


--
-- Name: line_occupancy fk_line_occupancy_train_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_occupancy
    ADD CONSTRAINT fk_line_occupancy_train_id FOREIGN KEY (train_id) REFERENCES public.train(id) ON DELETE RESTRICT;


--
-- Name: maintenance_requirement fk_maintenance_requirement_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requirement
    ADD CONSTRAINT fk_maintenance_requirement_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: maintenance_requirement fk_maintenance_requirement_defect_failure_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requirement
    ADD CONSTRAINT fk_maintenance_requirement_defect_failure_id FOREIGN KEY (defect_failure_id) REFERENCES public.defect_failure(id) ON DELETE RESTRICT;


--
-- Name: maintenance_requirement fk_maintenance_requirement_source_system_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requirement
    ADD CONSTRAINT fk_maintenance_requirement_source_system_id FOREIGN KEY (source_system_id) REFERENCES public.source_system(id) ON DELETE RESTRICT;


--
-- Name: operational_event fk_operational_event_train_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_event
    ADD CONSTRAINT fk_operational_event_train_id FOREIGN KEY (train_id) REFERENCES public.train(id) ON DELETE RESTRICT;


--
-- Name: optimization_input fk_optimization_input_candidate_block_window_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_input
    ADD CONSTRAINT fk_optimization_input_candidate_block_window_id FOREIGN KEY (candidate_block_window_id) REFERENCES public.candidate_block_window(id) ON DELETE RESTRICT;


--
-- Name: optimization_input fk_optimization_input_optimization_run_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_input
    ADD CONSTRAINT fk_optimization_input_optimization_run_id FOREIGN KEY (optimization_run_id) REFERENCES public.optimization_run(id) ON DELETE RESTRICT;


--
-- Name: optimization_input fk_optimization_input_planning_constraint_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_input
    ADD CONSTRAINT fk_optimization_input_planning_constraint_id FOREIGN KEY (planning_constraint_id) REFERENCES public.planning_constraint(id) ON DELETE RESTRICT;


--
-- Name: optimization_input fk_optimization_input_planning_resource_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_input
    ADD CONSTRAINT fk_optimization_input_planning_resource_id FOREIGN KEY (planning_resource_id) REFERENCES public.planning_resource(id) ON DELETE RESTRICT;


--
-- Name: optimization_input fk_optimization_input_planning_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_input
    ADD CONSTRAINT fk_optimization_input_planning_task_id FOREIGN KEY (planning_task_id) REFERENCES public.planning_task(id) ON DELETE RESTRICT;


--
-- Name: optimization_input fk_optimization_input_task_dependency_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_input
    ADD CONSTRAINT fk_optimization_input_task_dependency_id FOREIGN KEY (task_dependency_id) REFERENCES public.task_dependency(id) ON DELETE RESTRICT;


--
-- Name: optimization_output fk_optimization_output_candidate_block_window_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_output
    ADD CONSTRAINT fk_optimization_output_candidate_block_window_id FOREIGN KEY (candidate_block_window_id) REFERENCES public.candidate_block_window(id) ON DELETE RESTRICT;


--
-- Name: optimization_output fk_optimization_output_optimization_run_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_output
    ADD CONSTRAINT fk_optimization_output_optimization_run_id FOREIGN KEY (optimization_run_id) REFERENCES public.optimization_run(id) ON DELETE RESTRICT;


--
-- Name: optimization_output fk_optimization_output_planning_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_output
    ADD CONSTRAINT fk_optimization_output_planning_task_id FOREIGN KEY (planning_task_id) REFERENCES public.planning_task(id) ON DELETE RESTRICT;


--
-- Name: plan_validation fk_plan_validation_block_plan_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_validation
    ADD CONSTRAINT fk_plan_validation_block_plan_id FOREIGN KEY (block_plan_id) REFERENCES public.block_plan(id) ON DELETE RESTRICT;


--
-- Name: planning_constraint fk_planning_constraint_planning_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_constraint
    ADD CONSTRAINT fk_planning_constraint_planning_task_id FOREIGN KEY (planning_task_id) REFERENCES public.planning_task(id) ON DELETE RESTRICT;


--
-- Name: planning_priority fk_planning_priority_planning_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_priority
    ADD CONSTRAINT fk_planning_priority_planning_task_id FOREIGN KEY (planning_task_id) REFERENCES public.planning_task(id) ON DELETE RESTRICT;


--
-- Name: planning_resource fk_planning_resource_source_system_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_resource
    ADD CONSTRAINT fk_planning_resource_source_system_id FOREIGN KEY (source_system_id) REFERENCES public.source_system(id) ON DELETE RESTRICT;


--
-- Name: planning_task fk_planning_task_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_task
    ADD CONSTRAINT fk_planning_task_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: planning_task fk_planning_task_block_requirement_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_task
    ADD CONSTRAINT fk_planning_task_block_requirement_id FOREIGN KEY (block_requirement_id) REFERENCES public.block_requirement(id) ON DELETE RESTRICT;


--
-- Name: planning_task fk_planning_task_maintenance_requirement_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_task
    ADD CONSTRAINT fk_planning_task_maintenance_requirement_id FOREIGN KEY (maintenance_requirement_id) REFERENCES public.maintenance_requirement(id) ON DELETE RESTRICT;


--
-- Name: smms_alert fk_smms_alert_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_alert
    ADD CONSTRAINT fk_smms_alert_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: smms_alert fk_smms_alert_inspection_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_alert
    ADD CONSTRAINT fk_smms_alert_inspection_id FOREIGN KEY (inspection_id) REFERENCES public.smms_inspection(id) ON DELETE RESTRICT;


--
-- Name: smms_inspection fk_smms_inspection_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_inspection
    ADD CONSTRAINT fk_smms_inspection_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: smms_maintenance fk_smms_maintenance_alert_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_maintenance
    ADD CONSTRAINT fk_smms_maintenance_alert_id FOREIGN KEY (alert_id) REFERENCES public.smms_alert(id) ON DELETE RESTRICT;


--
-- Name: smms_maintenance fk_smms_maintenance_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smms_maintenance
    ADD CONSTRAINT fk_smms_maintenance_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: task_dependency fk_task_dependency_predecessor_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependency
    ADD CONSTRAINT fk_task_dependency_predecessor_task_id FOREIGN KEY (predecessor_task_id) REFERENCES public.planning_task(id) ON DELETE RESTRICT;


--
-- Name: task_dependency fk_task_dependency_successor_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependency
    ADD CONSTRAINT fk_task_dependency_successor_task_id FOREIGN KEY (successor_task_id) REFERENCES public.planning_task(id) ON DELETE RESTRICT;


--
-- Name: task_resource fk_task_resource_planning_resource_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_resource
    ADD CONSTRAINT fk_task_resource_planning_resource_id FOREIGN KEY (planning_resource_id) REFERENCES public.planning_resource(id) ON DELETE RESTRICT;


--
-- Name: task_resource fk_task_resource_planning_task_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_resource
    ADD CONSTRAINT fk_task_resource_planning_task_id FOREIGN KEY (planning_task_id) REFERENCES public.planning_task(id) ON DELETE RESTRICT;


--
-- Name: tdms_failure fk_tdms_failure_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_failure
    ADD CONSTRAINT fk_tdms_failure_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: tdms_failure fk_tdms_failure_inspection_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_failure
    ADD CONSTRAINT fk_tdms_failure_inspection_id FOREIGN KEY (inspection_id) REFERENCES public.tdms_inspection(id) ON DELETE RESTRICT;


--
-- Name: tdms_inspection fk_tdms_inspection_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_inspection
    ADD CONSTRAINT fk_tdms_inspection_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: tdms_maintenance fk_tdms_maintenance_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_maintenance
    ADD CONSTRAINT fk_tdms_maintenance_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: tdms_maintenance fk_tdms_maintenance_failure_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tdms_maintenance
    ADD CONSTRAINT fk_tdms_maintenance_failure_id FOREIGN KEY (failure_id) REFERENCES public.tdms_failure(id) ON DELETE RESTRICT;


--
-- Name: tms_defect fk_tms_defect_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_defect
    ADD CONSTRAINT fk_tms_defect_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: tms_defect fk_tms_defect_inspection_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_defect
    ADD CONSTRAINT fk_tms_defect_inspection_id FOREIGN KEY (inspection_id) REFERENCES public.tms_inspection(id) ON DELETE RESTRICT;


--
-- Name: tms_inspection fk_tms_inspection_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_inspection
    ADD CONSTRAINT fk_tms_inspection_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: tms_maintenance fk_tms_maintenance_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_maintenance
    ADD CONSTRAINT fk_tms_maintenance_asset_id FOREIGN KEY (asset_id) REFERENCES public.asset_master(id) ON DELETE RESTRICT;


--
-- Name: tms_maintenance fk_tms_maintenance_defect_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tms_maintenance
    ADD CONSTRAINT fk_tms_maintenance_defect_id FOREIGN KEY (defect_id) REFERENCES public.tms_defect(id) ON DELETE RESTRICT;


--
-- Name: train_movement fk_train_movement_train_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train_movement
    ADD CONSTRAINT fk_train_movement_train_id FOREIGN KEY (train_id) REFERENCES public.train(id) ON DELETE RESTRICT;


--
-- Name: train_schedule fk_train_schedule_train_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train_schedule
    ADD CONSTRAINT fk_train_schedule_train_id FOREIGN KEY (train_id) REFERENCES public.train(id) ON DELETE RESTRICT;


--
-- Name: train fk_train_source_system_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.train
    ADD CONSTRAINT fk_train_source_system_id FOREIGN KEY (source_system_id) REFERENCES public.source_system(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict o4QPbLsqGmsLAcb8gQcND7ytkKRomRdplT0ruoFQrAt26FNRIx9hiS7aBz0bvox

