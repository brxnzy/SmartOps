import Button from "../components/Button";
import { sileo } from "sileo";

export default function SileoTest() {
  const handleError = () => {
    sileo.error({
      title: "Something went wrong",
      description: "We received your payment of $49.00.",
      fill: "#171717",
      styles: {
        description: "text-white/75!"
      
    
      },
    });
  };

  const handleWarning = () => {
    sileo.warning({
      title: "Storage almost full",
      fill: "#171717",
    });
  };

  const handleInfo = () => {
    sileo.info({
      title: "New update available",
      fill: "#171717",
    });
  };

  const handleSuccess = () => {
    sileo.success({
      title: "Changes saved",
      fill: "#171717",
    });
  };

  return (
    <div className="flex gap-4 p-8">
      <Button
        onClick={handleSuccess}
        className="bg-green-500 hover:bg-green-600 text-white"
      >
        Success
      </Button>
      <Button
        onClick={handleError}
        className="bg-red-500 hover:bg-red-600 text-white"
      >
        Error
      </Button>
      <Button
        onClick={handleWarning}
        className="bg-yellow-500 hover:bg-yellow-600 text-white"
      >
        Warning
      </Button>
      <Button
        onClick={handleInfo}
        className="bg-blue-500 hover:bg-blue-600 text-white"
      >
        Info
      </Button>
    </div>
  );
}
