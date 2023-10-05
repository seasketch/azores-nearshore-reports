import React from "react";
import { usePopperTooltip } from "react-popper-tooltip";
import "react-popper-tooltip/dist/styles.css";
import { InfoCircleFill } from "@styled-icons/bootstrap";

export interface InformationTooltipProps {
  /** String to be presented in tooltip */
  text: string;
}

export const InformationTooltip: React.FunctionComponent<InformationTooltipProps> =
  ({ text }) => {
    const {
      getArrowProps,
      getTooltipProps,
      setTooltipRef,
      setTriggerRef,
      visible,
    } = usePopperTooltip();

    return (
      <div id="information_tooltip">
        <div id="icon" ref={setTriggerRef}>
          <InfoCircleFill
            size={14}
            style={{
              color: "#83C6E6",
              paddingRight: 5,
            }}
          />
        </div>
        {visible && (
          <div
            ref={setTooltipRef}
            {...getTooltipProps({
              className: "tooltip-container",
            })}
          >
            <div
              {...getArrowProps({
                className: "tooltip-arrow",
              })}
            />
            {text}
          </div>
        )}
      </div>
    );
  };
