from abc import ABC, abstractmethod
from typing import Dict, List


class DataProvider(ABC):
    source_name = "base"

    @abstractmethod
    def fetch(self, entity: str, filters: Dict) -> List[Dict]:
        raise NotImplementedError
