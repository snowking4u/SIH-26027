--
-- PostgreSQL database dump
--

\restrict ITk8B1eXE8RaHUuAG6r2yLPShtmMoLfHMbbKF8LSg4SoQXrev4nT3E2g8BoSemj

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

\unrestrict ITk8B1eXE8RaHUuAG6r2yLPShtmMoLfHMbbKF8LSg4SoQXrev4nT3E2g8BoSemj

