package com.ecms.service;

import com.ecms.dto.EyeglassCoatingDTO;
import com.ecms.dto.EyeglassFrameDTO;
import com.ecms.dto.LensTypeDTO;

import java.util.List;

public interface EyeglassCatalogService {
        List<LensTypeDTO> getActiveLensTypes();

        List<EyeglassFrameDTO> getActiveFrames();

        List<EyeglassCoatingDTO> getAllCoatings();

}
